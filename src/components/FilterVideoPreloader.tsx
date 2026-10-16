import React, { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { useEvent } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import { getPostVideoUrl } from '../utils/feedFilterCache';

type Props = {
  post: any;
  onReady: () => void;
};

/**
 * Tiny off-screen player that buffers the next filter's first clip.
 * Parent keeps showing the current feed until onReady fires, then swaps.
 */
export function FilterVideoPreloader({ post, onReady }: Props) {
  const videoUrl = getPostVideoUrl(post) || '';
  const readySent = useRef(false);

  const player = useVideoPlayer(videoUrl || null, (next) => {
    if (!next) {
      return;
    }
    next.loop = false;
    next.muted = true;
  });

  const statusEvent = useEvent(player, 'statusChange');
  const status = statusEvent?.status ?? player?.status;

  useEffect(() => {
    readySent.current = false;
  }, [videoUrl]);

  useEffect(() => {
    if (!player || !videoUrl) {
      return;
    }
    try {
      player.muted = true;
      player.play();
    } catch {
      // ignore
    }
  }, [player, videoUrl]);

  useEffect(() => {
    if (!player || readySent.current) {
      return;
    }
    if (status === 'readyToPlay' || player.playing) {
      readySent.current = true;
      try {
        player.pause();
        player.currentTime = 0;
      } catch {
        // ignore
      }
      onReady();
      return;
    }

    // Fallback so we never block filter switch forever.
    const timeout = setTimeout(() => {
      if (readySent.current) {
        return;
      }
      readySent.current = true;
      onReady();
    }, 2500);

    return () => clearTimeout(timeout);
  }, [player, status, onReady, videoUrl]);

  if (!videoUrl) {
    return null;
  }

  return (
    <View style={styles.slot} pointerEvents="none">
      <VideoView player={player} style={styles.video} contentFit="contain" nativeControls={false} />
    </View>
  );
}

const styles = StyleSheet.create({
  slot: {
    position: 'absolute',
    width: 2,
    height: 2,
    left: -20,
    top: -20,
    overflow: 'hidden',
    opacity: 1,
  },
  video: {
    width: 2,
    height: 2,
  },
});
