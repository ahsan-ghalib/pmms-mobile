import { useEvent } from 'expo';
import { VideoView, type VideoPlayer } from 'expo-video';
import { Image } from 'expo-image';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { AppState, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { addPauseFeedVideosListener } from '../utils/feedVideoPlayback';

type FeedMountedVideoProps = {
  player: VideoPlayer;
  feedIndex: number;
  videoUrl: string;
  isActive: boolean;
  isScreenFocused: boolean;
  isManuallyPaused: boolean;
  isSplashDone: boolean;
  isHomeScreen?: boolean;
  videoStyle: StyleProp<ViewStyle>;
  contentFit: 'cover' | 'contain' | 'fill';
  isModalOpen: boolean;
  usableHeight: number;
  thumbnailUrl: string | null;
  showPosterCover: boolean;
  hasPooledFirstFrame: boolean;
  onPlayerChange: (player: VideoPlayer | null) => void;
  onFirstFrameChange: (ready: boolean) => void;
  onPooledFirstFrame: (feedIndex: number) => void;
  onPooledClearFirstFrame: (feedIndex: number) => void;
  videoViewRef?: React.RefObject<any> | React.MutableRefObject<any>;
};

/**
 * Binds a pooled expo-video player to this cell. Does NOT create/destroy the
 * native player — the pool recycles via replace() so A↔B scroll stays smooth.
 */
function FeedMountedVideo({
  player,
  feedIndex,
  videoUrl,
  isActive,
  isScreenFocused,
  isManuallyPaused,
  isSplashDone,
  isHomeScreen,
  videoStyle,
  contentFit,
  isModalOpen,
  usableHeight,
  thumbnailUrl,
  showPosterCover,
  hasPooledFirstFrame,
  onPlayerChange,
  onFirstFrameChange,
  onPooledFirstFrame,
  onPooledClearFirstFrame,
  videoViewRef,
}: FeedMountedVideoProps) {
  const [hasFirstFrame, setHasFirstFrame] = useState(hasPooledFirstFrame);
  const [isAppActive, setIsAppActive] = useState(AppState.currentState === 'active');
  const hasFirstFrameRef = useRef(hasPooledFirstFrame);
  const playerRef = useRef(player);
  const canPlayRef = useRef(false);
  const lastActiveRef = useRef(isActive);
  const isActiveRef = useRef(isActive);
  const isScreenFocusedRef = useRef(isScreenFocused);

  playerRef.current = player;
  hasFirstFrameRef.current = hasFirstFrame;
  isActiveRef.current = isActive;
  isScreenFocusedRef.current = isScreenFocused;
  canPlayRef.current = Boolean(
    player && isActive && isScreenFocused && !isManuallyPaused && videoUrl,
  );

  useEffect(() => {
    setHasFirstFrame(hasPooledFirstFrame);
    hasFirstFrameRef.current = hasPooledFirstFrame;
    onFirstFrameChange(hasPooledFirstFrame);
  }, [hasPooledFirstFrame, onFirstFrameChange]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      const nextActive = nextState === 'active';
      setIsAppActive(nextActive);
      if (nextActive) {
        if (isActiveRef.current && isScreenFocusedRef.current && !isManuallyPaused) {
          try {
            if (playerRef.current) {
              playerRef.current.muted = false;
              playerRef.current.play();
            }
          } catch {
            // ignore
          }
        }
        return;
      }
      // Active clip stays playing so system auto-PiP can attach.
      if (isActiveRef.current && isScreenFocusedRef.current && !isManuallyPaused) {
        return;
      }
      hasFirstFrameRef.current = false;
      setHasFirstFrame(false);
      onFirstFrameChange(false);
      onPooledClearFirstFrame(feedIndex);
      try {
        playerRef.current?.pause();
        if (playerRef.current) {
          playerRef.current.muted = true;
        }
      } catch {
        // ignore
      }
    });
    return () => subscription.remove();
  }, [feedIndex, isManuallyPaused, onFirstFrameChange, onPooledClearFirstFrame]);

  useEffect(() => {
    onPlayerChange(player);
    return () => {
      onPlayerChange(null);
    };
  }, [player, onPlayerChange]);

  // Scrubber ProgressBar listens to timeUpdate — must be > 0 while active.
  useEffect(() => {
    if (!player) {
      return;
    }
    try {
      player.timeUpdateEventInterval = isActive ? 0.25 : 0;
    } catch {
      // ignore
    }
  }, [player, isActive]);

  const safelyPlay = useCallback(() => {
    const nextPlayer = playerRef.current;
    if (!isSplashDone || !canPlayRef.current || !nextPlayer) {
      return;
    }
    try {
      nextPlayer.muted = false;
      nextPlayer.play();
    } catch (error) {
      console.warn('Unable to play video', error);
    }
  }, [isSplashDone]);

  const safelyPause = useCallback(() => {
    const nextPlayer = playerRef.current;
    if (!nextPlayer) {
      return;
    }
    try {
      nextPlayer.pause();
      nextPlayer.muted = true;
    } catch (error: any) {
      if (!error?.message?.includes('NotFoundException')) {
        console.warn('Unable to pause video', error);
      }
    }
  }, []);

  useEffect(() => {
    if (!player) {
      return;
    }
    try {
      player.staysActiveInBackground = isActive && isScreenFocused && !isManuallyPaused;
    } catch {
      // ignore
    }
  }, [player, isActive, isScreenFocused, isManuallyPaused]);

  // Playback: active plays; neighbor warms once then stays paused (no seek).
  useEffect(() => {
    if (!isSplashDone || !player || !isScreenFocused || isManuallyPaused) {
      safelyPause();
      return;
    }
    if (!isAppActive && !isActive) {
      safelyPause();
      return;
    }

    if (isActive) {
      // Instant handoff: neighbor was already warming — play/unmute immediately.
      safelyPlay();
      lastActiveRef.current = true;
      const retries = [0, 50, 120, 280].map((ms) =>
        setTimeout(() => {
          if (canPlayRef.current) {
            safelyPlay();
          }
        }, ms),
      );
      return () => {
        retries.forEach(clearTimeout);
      };
    }

    lastActiveRef.current = false;
    try {
      player.muted = true;
      // Decode a frame ahead of time so swipe→play has no HLS cold start.
      if (!hasFirstFrameRef.current) {
        player.play();
      } else {
        player.pause();
      }
    } catch {
      // ignore warm errors
    }
    return undefined;
  }, [
    isSplashDone,
    isActive,
    isScreenFocused,
    isAppActive,
    isManuallyPaused,
    player,
    safelyPlay,
    safelyPause,
  ]);

  useEffect(() => {
    const subscription = addPauseFeedVideosListener(safelyPause);
    return () => {
      subscription.remove();
    };
  }, [safelyPause]);

  useEffect(() => {
    if (!player) {
      return;
    }
    const shouldUnmute =
      isActive && isScreenFocused && !isManuallyPaused && isSplashDone && (isAppActive || isActive);
    try {
      player.muted = !shouldUnmute;
      if (shouldUnmute) {
        // Already-warm neighbors must unmute/play on the same tick as isActive.
        player.play();
      } else if (!isSplashDone || !isScreenFocused || isManuallyPaused || !isActive) {
        player.pause();
        player.muted = true;
      }
    } catch {
      // ignore
    }
  }, [player, isActive, isScreenFocused, isAppActive, isManuallyPaused, isSplashDone]);

  const statusEvent = useEvent(player, 'statusChange');
  const currentStatus = statusEvent?.status ?? player?.status;

  useEffect(() => {
    if (!player) {
      return;
    }
    if (currentStatus === 'readyToPlay' && isSplashDone && isActive && isScreenFocused) {
      safelyPlay();
    }
  }, [player, currentStatus, isSplashDone, isActive, isAppActive, isScreenFocused, safelyPlay]);

  useEffect(() => {
    if (isHomeScreen && isActive && isScreenFocused && hasFirstFrame) {
      const { DeviceEventEmitter } = require('react-native');
      DeviceEventEmitter.emit('firstVideoReady');
    }
  }, [isHomeScreen, isActive, isScreenFocused, hasFirstFrame]);

  const keepPoster = showPosterCover || (isActive && !hasFirstFrame);

  return (
    <>
      <VideoView
        ref={videoViewRef}
        player={player}
        style={[
          videoStyle,
          isModalOpen && styles.modalOpenVideo,
          { opacity: isActive && hasFirstFrame ? 1 : 0 },
        ]}
        contentFit={contentFit}
        nativeControls={false}
        surfaceType="textureView"
        useExoShutter={false}
        allowsPictureInPicture={isActive && isScreenFocused}
        startsPictureInPictureAutomatically={isActive && isScreenFocused && !isManuallyPaused}
        onPictureInPictureStop={() => {
          if (AppState.currentState === 'active') return;
          try {
            playerRef.current?.pause();
            if (playerRef.current) {
              playerRef.current.muted = true;
            }
          } catch {
            // ignore
          }
        }}
        onFirstFrameRender={() => {
          hasFirstFrameRef.current = true;
          setHasFirstFrame(true);
          onFirstFrameChange(true);
          onPooledFirstFrame(feedIndex);
        }}
      />
      {keepPoster ? (
        <View
          style={[styles.videoLoadingOverlay, { top: 0, bottom: undefined, height: usableHeight }]}
          pointerEvents="none"
        >
          {thumbnailUrl ? (
            <Image
              source={{ uri: thumbnailUrl }}
              style={styles.videoLoadingThumbnail}
              contentFit="cover"
              cachePolicy="memory-disk"
              priority="high"
            />
          ) : (
            <View style={[styles.videoLoadingThumbnail, { backgroundColor: '#111' }]} />
          )}
        </View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  modalOpenVideo: {
    opacity: 0,
  },
  videoLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000',
    zIndex: 2,
  },
  videoLoadingThumbnail: {
    width: '100%',
    height: '100%',
  },
});

export default memo(FeedMountedVideo);
