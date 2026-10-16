import { Platform } from 'react-native';
import { setVideoCacheSizeAsync } from 'expo-video';
import { hydratePersistedFilterCache } from './feedFilterCache';
import { hydrateFeedVideoCache } from './feedVideoDiskCache';

const FEED_CACHE_BYTES = 512 * 1024 * 1024;
let started = false;

/** Cap expo-video disk cache before any player mounts. Safe to call twice. */
export function initVideoCache(): void {
  if (started || Platform.OS === 'web') {
    return;
  }
  started = true;
  setVideoCacheSizeAsync(FEED_CACHE_BYTES).catch(() => {});
  void Promise.all([hydratePersistedFilterCache(), hydrateFeedVideoCache()]).catch(() => {});
}
