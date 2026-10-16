import { Directory, DownloadTask, File, Paths } from 'expo-file-system';
import NetInfo from '@react-native-community/netinfo';
import { getPostDownloadUrl, getPostVideoUrl } from './feedFilterCache';

const WINDOW_SIZE = 3;
const MAX_CLIPS = 16;
const MIN_FILE_BYTES = 24 * 1024;
const MAX_HLS_SEGMENTS = 48;

const ready = new Map<string, string>();
const inflight = new Map<string, Promise<string | null>>();
const lru: string[] = [];
const listeners = new Set<() => void>();
let preferLocalPlayback = false;
let hydrating = false;
let persistTimer: ReturnType<typeof setTimeout> | null = null;
let hydratePromise: Promise<void> | null = null;

function notify(): void {
  listeners.forEach((listener) => listener());
}

export function setPreferLocalPlayback(value: boolean): void {
  if (preferLocalPlayback === value) {
    return;
  }
  preferLocalPlayback = value;
  notify();
}

export function isPreferLocalPlayback(): boolean {
  return preferLocalPlayback;
}

export function subscribeFeedVideoCache(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function clipKey(url: string): string {
  let hash = 2166136261;
  for (let i = 0; i < url.length; i += 1) {
    hash ^= url.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function isHlsUrl(url: string): boolean {
  return url.toLowerCase().includes('.m3u8');
}

function clipsRoot(): Directory {
  const dir = new Directory(Paths.cache, 'soouq-feed-clips');
  if (!dir.exists) {
    dir.create();
  }
  return dir;
}

function touchLru(url: string): void {
  const at = lru.indexOf(url);
  if (at >= 0) {
    lru.splice(at, 1);
  }
  lru.push(url);
}

function persistManifestSoon(): void {
  if (hydrating) {
    return;
  }
  if (persistTimer) {
    clearTimeout(persistTimer);
  }
  persistTimer = setTimeout(() => {
    persistTimer = null;
    try {
      const file = new File(clipsRoot(), 'manifest.json');
      if (file.exists) {
        file.delete();
      }
      file.create();
      file.write(
        JSON.stringify({
          version: 1,
          urls: Object.fromEntries(ready.entries()),
        }),
      );
    } catch {
      // ignore
    }
  }, 200);
}

function remember(url: string, localUri: string): string {
  ready.set(url, localUri);
  touchLru(url);
  evictIfNeeded();
  persistManifestSoon();
  notify();
  return localUri;
}

function evictIfNeeded(): void {
  if (hydrating) {
    return;
  }
  while (lru.length > MAX_CLIPS) {
    const oldest = lru.shift();
    if (!oldest) {
      break;
    }
    ready.delete(oldest);
    try {
      const key = clipKey(oldest);
      const pack = new Directory(clipsRoot(), key);
      if (pack.exists) {
        pack.delete();
      }
      const mp4 = new File(clipsRoot(), `${key}.mp4`);
      if (mp4.exists) {
        mp4.delete();
      }
    } catch {
      // ignore
    }
  }
}

function lookupOnDisk(url: string): string | null {
  const key = clipKey(url);
  if (isHlsUrl(url)) {
    const playlist = new File(clipsRoot(), key, 'index.m3u8');
    if (playlist.exists && playlist.size > 32) {
      return remember(url, playlist.uri);
    }
    return null;
  }
  const mp4 = new File(clipsRoot(), `${key}.mp4`);
  if (mp4.exists && mp4.size >= MIN_FILE_BYTES) {
    return remember(url, mp4.uri);
  }
  return null;
}

export function getCachedPlayUri(remoteUrl: string | null | undefined): string | null {
  if (!remoteUrl) {
    return null;
  }
  return ready.get(remoteUrl) ?? lookupOnDisk(remoteUrl);
}

export function resolvePlayableVideoUrl(post: any): string | null {
  const stream = getPostVideoUrl(post);
  const mp4 = getPostDownloadUrl(post);
  const local = getCachedPlayUri(mp4) || getCachedPlayUri(stream);
  if (local) {
    return local;
  }
  if (preferLocalPlayback) {
    return null;
  }
  return stream;
}

export function hasCachedPlayableVideo(post: any): boolean {
  const stream = getPostVideoUrl(post);
  const mp4 = getPostDownloadUrl(post);
  return Boolean(getCachedPlayUri(mp4) || getCachedPlayUri(stream));
}

export function filterCachedPlayablePosts(posts: any[]): any[] {
  return posts.filter((post) => {
    if (post?.type === 'image') {
      return true;
    }
    return hasCachedPlayableVideo(post);
  });
}

export async function hydrateFeedVideoCache(): Promise<void> {
  if (hydratePromise) {
    return hydratePromise;
  }
  hydratePromise = (async () => {
    hydrating = true;
    try {
      const file = new File(clipsRoot(), 'manifest.json');
      if (!file.exists) {
        return;
      }
      const parsed = (await file.json()) as { urls?: Record<string, string> };
      const urls = parsed?.urls;
      if (!urls || typeof urls !== 'object') {
        return;
      }
      for (const [url, localUri] of Object.entries(urls)) {
        if (typeof url !== 'string' || typeof localUri !== 'string') {
          continue;
        }
        const fromDisk = lookupOnDisk(url);
        if (fromDisk) {
          continue;
        }
        try {
          const local = new File(localUri);
          if (local.exists && (local.size ?? 0) > 32) {
            remember(url, local.uri);
          }
        } catch {
          // missing file
        }
      }
    } catch {
      // ignore
    } finally {
      hydrating = false;
    }
  })();
  return hydratePromise;
}

function resolvePlaylistChild(line: string, playlistUrl: string): string | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) {
    return null;
  }
  try {
    return new URL(trimmed, playlistUrl).toString();
  } catch {
    return null;
  }
}

function parseHlsEntries(text: string, playlistUrl: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => resolvePlaylistChild(line, playlistUrl))
    .filter((url): url is string => Boolean(url));
}

function pickHlsVariant(text: string, playlistUrl: string): string | null {
  const variants = parseHlsEntries(text, playlistUrl);
  if (variants.length === 0) {
    return null;
  }
  return variants[Math.min(variants.length - 1, 1)] || variants[0];
}

async function downloadToFile(url: string, dest: File): Promise<boolean> {
  if (dest.exists) {
    try {
      dest.delete();
    } catch {
      // replace
    }
  }
  const file = await new DownloadTask(url, dest).downloadAsync();
  return Boolean(file?.exists && (file.size ?? 0) > 0);
}

async function cacheProgressive(url: string): Promise<string | null> {
  const dest = new File(clipsRoot(), `${clipKey(url)}.mp4`);
  const ok = await downloadToFile(url, dest);
  if (!ok || dest.size < MIN_FILE_BYTES) {
    try {
      if (dest.exists) {
        dest.delete();
      }
    } catch {
      // ignore
    }
    return null;
  }
  return dest.uri;
}

async function cacheHls(url: string): Promise<string | null> {
  const pack = new Directory(clipsRoot(), clipKey(url));
  if (!pack.exists) {
    pack.create();
  }

  const masterRes = await fetch(url);
  if (!masterRes.ok) {
    return null;
  }
  let playlistUrl = url;
  let playlistText = await masterRes.text();
  if (!playlistText.includes('#EXTM3U')) {
    return null;
  }

  if (playlistText.includes('#EXT-X-STREAM-INF')) {
    const variant = pickHlsVariant(playlistText, playlistUrl);
    if (!variant) {
      return null;
    }
    const variantRes = await fetch(variant);
    if (!variantRes.ok) {
      return null;
    }
    playlistUrl = variant;
    playlistText = await variantRes.text();
  }

  const segments = parseHlsEntries(playlistText, playlistUrl).slice(0, MAX_HLS_SEGMENTS);
  if (segments.length === 0) {
    return null;
  }

  const localNames: Record<string, string> = {};
  for (let i = 0; i < segments.length; i += 1) {
    const segmentUrl = segments[i];
    const extMatch = segmentUrl.match(/\.(m4s|ts|mp4|aac)(\?|$)/i);
    const ext = extMatch?.[1] || 'ts';
    const name = `seg-${i}.${ext}`;
    const dest = new File(pack, name);
    const ok = await downloadToFile(segmentUrl, dest);
    if (!ok) {
      return null;
    }
    localNames[segmentUrl] = name;
  }

  const rewritten = playlistText
    .split(/\r?\n/)
    .map((line) => {
      const child = resolvePlaylistChild(line, playlistUrl);
      if (child && localNames[child]) {
        return localNames[child];
      }
      return line;
    })
    .join('\n');

  const index = new File(pack, 'index.m3u8');
  if (index.exists) {
    index.delete();
  }
  index.create();
  index.write(rewritten);
  return index.uri;
}

export async function ensureFeedVideoCached(url: string): Promise<string | null> {
  const existing = getCachedPlayUri(url);
  if (existing) {
    return existing;
  }
  const pending = inflight.get(url);
  if (pending) {
    return pending;
  }

  const job = (async () => {
    try {
      const local = isHlsUrl(url) ? await cacheHls(url) : await cacheProgressive(url);
      if (!local) {
        return null;
      }
      return remember(url, local);
    } catch {
      return null;
    } finally {
      inflight.delete(url);
    }
  })();

  inflight.set(url, job);
  return job;
}

export async function prefetchFeedDiskWindow(posts: any[], fromIndex: number): Promise<void> {
  const net = await NetInfo.fetch().catch(() => null);
  if (net && net.isConnected === false) {
    return;
  }
  const slice = posts.slice(Math.max(0, fromIndex), Math.max(0, fromIndex) + WINDOW_SIZE);
  for (const post of slice) {
    const mp4 = getPostDownloadUrl(post);
    const stream = getPostVideoUrl(post);
    const target = mp4 || stream;
    if (!target) {
      continue;
    }
    await ensureFeedVideoCached(target);
    if (mp4 && stream && mp4 !== stream) {
      const local = getCachedPlayUri(mp4);
      if (local) {
        remember(stream, local);
      }
    }
  }
}
