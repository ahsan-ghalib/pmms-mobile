import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'react-native';

export type FeedFilter = 'shop' | 'user' | 'all';

const ALL_FILTERS: FeedFilter[] = ['all', 'shop', 'user'];
const PERSIST_KEY = '@soouq/home-feed-v1';
const MAX_PERSISTED_POSTS = 24;

type CacheEntry = {
  posts: any[];
  fetchedAt: number;
};

const cache = new Map<FeedFilter, CacheEntry>();
const inflight = new Map<FeedFilter, Promise<any[]>>();
const warmedUrls = new Set<string>();
const MAX_WARMED_URLS = 80;
let persistTimer: ReturnType<typeof setTimeout> | null = null;
let hydratePromise: Promise<void> | null = null;

function rememberWarmed(key: string): boolean {
  if (warmedUrls.has(key)) {
    return false;
  }
  if (warmedUrls.size >= MAX_WARMED_URLS) {
    // Drop oldest insertion order entries so long sessions don't grow forever.
    const first = warmedUrls.values().next().value;
    if (first) {
      warmedUrls.delete(first);
    }
  }
  warmedUrls.add(key);
  return true;
}

const CACHE_TTL_MS = 5 * 60 * 1000;

function isHlsUrl(url: string): boolean {
  return url.toLowerCase().includes('.m3u8');
}

function normalizeMediaUrl(value: string, apiBase: string): string {
  let url = value;
  if (url.startsWith('/')) url = `${apiBase}${url}`;
  url = url
    .replace(/https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/g, apiBase)
    .replace(/https?:\/\/soouq-live\.test/g, apiBase);

  if (url.includes('/posts/posts/')) {
    url = url.replace('/posts/posts/', '/posts/');
  }

  return url;
}

export function getPostVideoUrl(post: any): string | null {
  const apiBase = (process.env.EXPO_PUBLIC_API_URL || 'http://127.0.0.1:8000/api').replace(
    /\/api\/?$/,
    '',
  );

  // Never invent `/storage/{original_path}` — originals live on OCI and the
  // local copy is deleted after HLS finishes. Use API absolute URLs only.
  const fileCandidates = [
    post?.postsFiles?.[0]?.url,
    post?.postsFiles?.[0]?.file,
    post?.postsFiles?.[0]?.video_url,
    post?.original_url,
    post?.hls_url,
  ]
    .filter((value): value is string => typeof value === 'string' && value.length > 0)
    .map((value) => normalizeMediaUrl(value, apiBase));

  const mp4Url = fileCandidates.find((url) => !isHlsUrl(url)) || null;
  const hlsUrl = fileCandidates.find((url) => isHlsUrl(url)) || null;

  // While transcoding, hls_url is often still the raw MP4. After ready,
  // hls_url is the processed stream — the original MP4 may be gone or
  // unplayable until fully downloaded (no faststart).
  if (post?.status === 'processing') {
    return mp4Url || hlsUrl;
  }

  return hlsUrl || mp4Url;
}

/**
 * Gallery download needs a progressive MP4. HLS playlists / variants cannot be
 * saved directly to the camera roll.
 *
 * Prefer `original_url` (CDN/OCI). Skip relative junk and `.m3u8` paths — those
 * either 404 after local originals are deleted, or are not gallery-compatible.
 */
export function getPostDownloadUrl(post: any): string | null {
  const apiBase = (process.env.EXPO_PUBLIC_API_URL || 'http://127.0.0.1:8000/api').replace(
    /\/api\/?$/,
    '',
  );

  const rawCandidates = [
    post?.original_url,
    post?.postsFiles?.[0]?.url,
    post?.postsFiles?.[0]?.file,
    post?.postsFiles?.[0]?.video_url,
  ].filter((value): value is string => typeof value === 'string' && value.length > 0);

  const urls = rawCandidates
    .map((value) => normalizeMediaUrl(value, apiBase))
    .filter((url) => {
      if (isHlsUrl(url)) return false;
      // Must be an absolute http(s) URL — relative storage paths often 404.
      return /^https?:\/\//i.test(url);
    });

  // Prefer CDN / object-storage hosts over app API hosts.
  const cdnFirst = [
    ...urls.filter((url) => /cdn\.|objectstorage|oraclecloud|aliyuncs|amazonaws/i.test(url)),
    ...urls,
  ];

  return cdnFirst[0] || null;
}

export function getPostThumbnailUrl(post: any): string | null {
  return (
    post?.thumbnail_url ||
    post?.thumbnail ||
    post?.cover ||
    post?.cover_url ||
    post?.postsFiles?.[0]?.thumbnail ||
    post?.postsFiles?.[0]?.thumbnail_url ||
    null
  );
}

/** Prefetch thumbnails ahead of the viewport (cheap, big UX win). */
export function warmUpcomingThumbnails(posts: any[], fromIndex: number, count = 5): void {
  posts.slice(fromIndex, fromIndex + count).forEach((post) => {
    const thumb = getPostThumbnailUrl(post);
    if (!thumb || !rememberWarmed(`thumb:${thumb}`)) {
      return;
    }
    Image.prefetch(thumb).catch(() => {});
  });
}

/**
 * Warm HLS playlists / first bytes for upcoming clips without mounting players.
 * Safe for ~2–3 ahead; do NOT do this for 10 full videos (wastes radio + RAM).
 */
export async function warmUpcomingPlaylists(
  posts: any[],
  fromIndex: number,
  count = 2,
): Promise<void> {
  const targets = posts.slice(fromIndex, fromIndex + count);

  await Promise.all(
    targets.map(async (post) => {
      const videoUrl = getPostVideoUrl(post);
      if (!videoUrl || !rememberWarmed(`playlist:${videoUrl}`)) {
        return;
      }

      try {
        // Playlist files are tiny; this primes DNS/TLS + edge cache only.
        await fetch(videoUrl, { method: 'GET' });
      } catch {
        // Ignore — real player will fetch again.
      }
    }),
  );
}

/** Warm CDN/HTTP cache for the first few videos + thumbnails of a filter feed. */
export async function warmFilterMedia(posts: any[], count = 2): Promise<void> {
  warmUpcomingThumbnails(posts, 0, Math.max(count, 5));
  const { prefetchFeedWindow } = await import('./videoWindowPrefetch');
  await prefetchFeedWindow(
    posts.map((post) => getPostVideoUrl(post)),
    0,
  );
}

export function getCachedFilterPosts(filter: FeedFilter): any[] | null {
  const entry = cache.get(filter);
  if (!entry) {
    return null;
  }
  // Stale-while-revalidate: always return for instant UI, including empty
  // results so a known-empty filter doesn't re-hit the network on every tap.
  return entry.posts;
}

function trimPersistedPosts(posts: any[]): any[] {
  return posts.slice(0, MAX_PERSISTED_POSTS);
}

function persistFilterCacheSoon(): void {
  if (persistTimer) {
    clearTimeout(persistTimer);
  }
  persistTimer = setTimeout(() => {
    persistTimer = null;
    const filters: Record<string, CacheEntry> = {};
    for (const filter of ALL_FILTERS) {
      const entry = cache.get(filter);
      if (!entry || entry.posts.length === 0) {
        continue;
      }
      filters[filter] = {
        posts: trimPersistedPosts(entry.posts),
        fetchedAt: entry.fetchedAt,
      };
    }
    AsyncStorage.setItem(PERSIST_KEY, JSON.stringify({ version: 1, filters })).catch(() => {});
  }, 280);
}

export function setCachedFilterPosts(
  filter: FeedFilter,
  posts: any[],
  options?: { persist?: boolean; warm?: boolean; fetchedAt?: number },
): void {
  cache.set(filter, {
    posts,
    fetchedAt: options?.fetchedAt ?? Date.now(),
  });
  if (options?.persist !== false && posts.length > 0) {
    persistFilterCacheSoon();
  }
  if (options?.warm !== false && posts.length > 0) {
    warmFilterMedia(posts).catch(() => {});
  }
}

export async function hydratePersistedFilterCache(): Promise<void> {
  if (hydratePromise) {
    return hydratePromise;
  }
  hydratePromise = (async () => {
    try {
      const raw = await AsyncStorage.getItem(PERSIST_KEY);
      if (!raw) {
        return;
      }
      const parsed = JSON.parse(raw) as {
        filters?: Record<string, { posts?: any[]; fetchedAt?: number }>;
      };
      const filters = parsed?.filters;
      if (!filters || typeof filters !== 'object') {
        return;
      }
      for (const filter of ALL_FILTERS) {
        if (cache.has(filter)) {
          continue;
        }
        const entry = filters[filter];
        const posts = Array.isArray(entry?.posts) ? entry.posts : [];
        if (posts.length === 0) {
          continue;
        }
        cache.set(filter, {
          posts,
          fetchedAt: Number(entry?.fetchedAt) || 0,
        });
      }
    } catch {
      // Ignore corrupt disk cache — network fetch still runs.
    }
  })();
  return hydratePromise;
}

export function isFilterCacheFresh(filter: FeedFilter): boolean {
  const entry = cache.get(filter);
  if (!entry) {
    return false;
  }
  return Date.now() - entry.fetchedAt <= CACHE_TTL_MS;
}

/** True once we've fetched this filter at least once in this session. */
export function hasFilterCache(filter: FeedFilter): boolean {
  return cache.has(filter);
}

export function getInflightFilterFetch(filter: FeedFilter): Promise<any[]> | undefined {
  return inflight.get(filter);
}

export function setInflightFilterFetch(
  filter: FeedFilter,
  promise: Promise<any[]>,
): Promise<any[]> {
  inflight.set(filter, promise);
  promise.finally(() => {
    if (inflight.get(filter) === promise) {
      inflight.delete(filter);
    }
  });
  return promise;
}

export function otherFilters(current: FeedFilter): FeedFilter[] {
  return ALL_FILTERS.filter((f) => f !== current);
}

export { ALL_FILTERS };
