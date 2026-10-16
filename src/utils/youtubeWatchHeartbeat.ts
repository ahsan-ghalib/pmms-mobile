import { Platform } from 'react-native';
import apiClient from '../api/apiClient';
import { ENDPOINTS } from '../api/endpoints';

const HEARTBEAT_MS = 30_000;

function newSessionKey(): string {
  try {
    // Hermes / modern RN
    // eslint-disable-next-line no-undef
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      // eslint-disable-next-line no-undef
      return crypto.randomUUID();
    }
  } catch {
    // fall through
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

type WatchPingArgs = {
  youtubeVideoId: string;
  vendorId?: number | null;
};

/**
 * Opens a watch session, heartbeats every 30s while active, leaves on cleanup.
 * Returns a disposer for React useEffect cleanup.
 */
export function startYouTubeWatchHeartbeat({
  youtubeVideoId,
  vendorId,
}: WatchPingArgs): () => void {
  if (!youtubeVideoId) {
    return () => {};
  }

  const sessionKey = newSessionKey();
  let stopped = false;
  let timer: ReturnType<typeof setInterval> | null = null;

  const bodyBase = {
    session_key: sessionKey,
    youtube_video_id: youtubeVideoId,
    vendor_id: vendorId ? Number(vendorId) : undefined,
    source: 'customer_app',
    platform: Platform.OS,
  };

  const open = async () => {
    if (stopped) return;
    try {
      await apiClient.post(ENDPOINTS.YOUTUBE.WATCH_OPEN, bodyBase);
    } catch (e) {
      console.log('[YTWatch] open failed', e);
    }
  };

  const heartbeat = async () => {
    if (stopped) return;
    try {
      await apiClient.post(ENDPOINTS.YOUTUBE.WATCH_HEARTBEAT, {
        session_key: sessionKey,
        youtube_video_id: youtubeVideoId,
        vendor_id: vendorId ? Number(vendorId) : undefined,
      });
    } catch (e) {
      console.log('[YTWatch] heartbeat failed', e);
    }
  };

  const leave = async () => {
    try {
      await apiClient.post(ENDPOINTS.YOUTUBE.WATCH_LEAVE, {
        session_key: sessionKey,
      });
    } catch {
      // best-effort
    }
  };

  void open();
  timer = setInterval(() => {
    void heartbeat();
  }, HEARTBEAT_MS);

  return () => {
    stopped = true;
    if (timer) clearInterval(timer);
    void leave();
  };
}
