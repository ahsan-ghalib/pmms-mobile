import { DownloadTask, File, Paths } from 'expo-file-system';

export type VideoDownloadStatus = 'idle' | 'downloading' | 'saving' | 'done' | 'error';

export type VideoDownloadState = {
  status: VideoDownloadStatus;
  postId: number | null;
  /** 0–1 while downloading; 1 while saving/done. */
  progress: number;
  errorKey?: 'busy' | 'permission' | 'no_url' | 'failed';
};

type Listener = (state: VideoDownloadState) => void;

const IDLE: VideoDownloadState = {
  status: 'idle',
  postId: null,
  progress: 0,
};

/**
 * Lazy-load the legacy MediaLibrary API.
 *
 * The new root import (`expo-media-library`) requires `ExpoMediaLibraryNext`,
 * which is missing until a clean native rebuild — and a top-level import of it
 * crashes the whole tab tree. Legacy uses `ExpoMediaLibrary` instead.
 */
async function loadMediaLibrary() {
  return import('expo-media-library/legacy');
}

/**
 * App-wide video download gate — only one download may run at a time.
 * UI subscribes for progress; callers just `start()`.
 */
class VideoDownloadManager {
  private state: VideoDownloadState = IDLE;
  private listeners = new Set<Listener>();
  private task: DownloadTask | null = null;

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => {
      this.listeners.delete(listener);
    };
  }

  getState(): VideoDownloadState {
    return this.state;
  }

  isBusy(): boolean {
    return this.state.status === 'downloading' || this.state.status === 'saving';
  }

  private setState(next: VideoDownloadState) {
    this.state = next;
    this.listeners.forEach((listener) => listener(next));
  }

  async start(options: { postId: number; url: string }): Promise<void> {
    const { postId, url } = options;

    if (this.isBusy()) {
      throw new Error('BUSY');
    }

    if (!url || url.toLowerCase().includes('.m3u8')) {
      throw new Error('NO_URL');
    }

    // Fast existence check — processed videos often expose a dead original_url
    // after the local MP4 was deleted (HTTP 404). Fail clearly before download.
    try {
      const head = await fetch(url, { method: 'HEAD' });
      if (!head.ok) {
        console.error('[VideoDownload] URL not reachable', head.status, url);
        throw new Error('NO_URL');
      }
    } catch (error) {
      if (error instanceof Error && error.message === 'NO_URL') {
        throw error;
      }
      // Some CDNs reject HEAD — continue and let the download report the real error.
      console.warn('[VideoDownload] HEAD probe failed, continuing', url, error);
    }

    console.log('[VideoDownload] starting', { postId, url });

    let MediaLibrary: typeof import('expo-media-library/legacy');
    try {
      MediaLibrary = await loadMediaLibrary();
    } catch (error) {
      console.error('[VideoDownload] MediaLibrary native module missing — rebuild the app', error);
      throw new Error('FAILED');
    }

    const permission = await MediaLibrary.requestPermissionsAsync(true);
    if (!permission.granted) {
      throw new Error('PERMISSION');
    }

    const dest = new File(Paths.cache, `soouq-download-${postId}-${Date.now()}.mp4`);
    if (dest.exists) {
      try {
        dest.delete();
      } catch {
        // ignore
      }
    }

    this.setState({
      status: 'downloading',
      postId,
      progress: 0,
    });

    try {
      const task = new DownloadTask(url, dest, {
        onProgress: ({ bytesWritten, totalBytes }) => {
          const progress = totalBytes > 0 ? Math.min(1, Math.max(0, bytesWritten / totalBytes)) : 0;
          this.setState({
            status: 'downloading',
            postId,
            progress,
          });
        },
      });
      this.task = task;

      const file = await task.downloadAsync();
      this.task = null;

      if (!file) {
        throw new Error('CANCELLED');
      }

      this.setState({
        status: 'saving',
        postId,
        progress: 1,
      });

      // Legacy save — writes into Photos without needing ExpoMediaLibraryNext.
      await MediaLibrary.saveToLibraryAsync(file.uri);

      try {
        if (file.exists) {
          file.delete();
        }
      } catch {
        // ignore cleanup failures
      }

      this.setState({
        status: 'done',
        postId,
        progress: 1,
      });

      setTimeout(() => {
        if (this.state.status === 'done' && this.state.postId === postId) {
          this.setState(IDLE);
        }
      }, 1500);
    } catch (error) {
      this.task = null;
      try {
        if (dest.exists) {
          dest.delete();
        }
      } catch {
        // ignore
      }
      const message = error instanceof Error ? error.message : '';
      console.error('[VideoDownload] failed', message, error);
      if (
        message === 'BUSY' ||
        message === 'PERMISSION' ||
        message === 'NO_URL' ||
        message === 'FAILED'
      ) {
        throw error instanceof Error ? error : new Error(message);
      }
      this.setState({
        status: 'error',
        postId,
        progress: 0,
        errorKey: 'failed',
      });
      throw new Error('FAILED');
    }
  }
}

export const videoDownloadManager = new VideoDownloadManager();
