import { Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import type { VideoSource } from 'expo-video';
import { ensureFeedVideoCached, getCachedPlayUri } from './feedVideoDiskCache';

const MAX_AHEAD_WIFI = 2;
const MAX_AHEAD_CELL = 1;
const MAX_HLS_CHILDREN = 2;
const PROGRESSIVE_HEAD_BYTES = 512 * 1024;
const warmed = new Set<string>();
const MAX_WARMED = 36;

let paused = false;
let queue: string[] = [];
let running = false;

function remember(url: string): boolean {
  if (warmed.has(url)) {
    return false;
  }
  if (warmed.size >= MAX_WARMED) {
    const first = warmed.values().next().value;
    if (first) {
      warmed.delete(first);
    }
  }
  warmed.add(url);
  return true;
}

function resolvePlaylistUrl(line: string, playlistUrl: string): string | null {
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

function parseHlsChildren(text: string, playlistUrl: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => resolvePlaylistUrl(line, playlistUrl))
    .filter((url): url is string => Boolean(url))
    .slice(0, MAX_HLS_CHILDREN);
}

async function fetchIntoCache(url: string, rangeBytes?: number): Promise<string | null> {
  const headers: Record<string, string> = {};
  if (rangeBytes && rangeBytes > 0) {
    headers.Range = `bytes=0-${rangeBytes - 1}`;
  }
  const response = await fetch(url, {
    method: 'GET',
    headers,
  });
  if (!response.ok && response.status !== 206) {
    return null;
  }
  const contentType = String(response.headers.get('content-type') || '').toLowerCase();
  const looksLikePlaylist = contentType.includes('mpegurl') || url.toLowerCase().includes('.m3u8');
  if (looksLikePlaylist) {
    return response.text();
  }
  await response.arrayBuffer();
  return null;
}

async function warmUrl(url: string): Promise<void> {
  if (paused || !remember(url)) {
    return;
  }
  try {
    const isHls = url.toLowerCase().includes('.m3u8');
    const body = await fetchIntoCache(url, isHls ? undefined : PROGRESSIVE_HEAD_BYTES);
    if (!body || !body.includes('#EXTM3U')) {
      return;
    }
    const children = parseHlsChildren(body, url);
    for (const child of children) {
      if (paused) {
        return;
      }
      if (!remember(child)) {
        continue;
      }
      const childIsHls = child.toLowerCase().includes('.m3u8');
      const childBody = await fetchIntoCache(child);
      if (childIsHls && childBody?.includes('#EXTM3U')) {
        const segments = parseHlsChildren(childBody, child);
        for (const segment of segments) {
          if (paused) {
            return;
          }
          if (remember(segment)) {
            await fetchIntoCache(segment);
          }
        }
      }
    }
  } catch {
    // Player will fetch again.
  }
}

async function drainQueue(): Promise<void> {
  if (running) {
    return;
  }
  running = true;
  try {
    while (queue.length > 0 && !paused) {
      const next = queue.shift();
      if (next) {
        await warmUrl(next);
      }
    }
  } finally {
    running = false;
  }
}

export function pauseVideoWindowPrefetch(): void {
  paused = true;
  queue = [];
}

export function resumeVideoWindowPrefetch(): void {
  paused = false;
}

/** TikTok-style: keep the next 1–2 clips' first bytes in HTTP/disk cache. */
export async function prefetchFeedWindow(
  urls: Array<string | null | undefined>,
  fromIndex: number,
): Promise<void> {
  if (paused) {
    return;
  }
  const net = await NetInfo.fetch().catch(() => null);
  if (net && net.isConnected === false) {
    return;
  }
  const wifi = net?.type === 'wifi' || net?.type === 'ethernet';
  const ahead = wifi ? MAX_AHEAD_WIFI : MAX_AHEAD_CELL;
  const targets = urls
    .slice(fromIndex, fromIndex + ahead)
    .filter((url): url is string => typeof url === 'string' && url.length > 0);

  for (const url of targets) {
    if (!queue.includes(url) && !warmed.has(url)) {
      queue.push(url);
    }
  }
  await Promise.all([
    drainQueue(),
    ...targets.map((url) => ensureFeedVideoCached(url).catch(() => null)),
  ]);
}

export function toCachedVideoSource(url: string): VideoSource {
  const local = getCachedPlayUri(url);
  const playUrl = local || url;
  const isHls = playUrl.toLowerCase().includes('.m3u8');
  const useCaching = !local && !(isHls && Platform.OS === 'ios');
  if (isHls) {
    return { uri: playUrl, contentType: 'hls', useCaching };
  }
  return { uri: playUrl, useCaching };
}
