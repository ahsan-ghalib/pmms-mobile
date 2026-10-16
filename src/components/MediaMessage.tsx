import React from 'react';
import { View, StyleSheet, Text, Pressable } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { Ionicons } from '@expo/vector-icons';

interface MediaMessageProps {
  url: string;
  type: 'audio' | 'video';
  isMine: boolean;
}

const formatTime = (time: number) => {
  if (!time || isNaN(time)) return '0:00';
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

export function MediaMessage({ url, type, isMine }: MediaMessageProps) {
  // Video Player
  const videoPlayer = useVideoPlayer(url, (player) => {
    player.loop = false;
  });

  // Audio Player
  const audioPlayer = useAudioPlayer(url);
  const audioStatus = useAudioPlayerStatus(audioPlayer);

  if (type === 'video') {
    return (
      <View
        style={[
          styles.videoContainer,
          { backgroundColor: isMine ? 'rgba(255,255,255,0.2)' : '#f3f4f6' },
        ]}
      >
        <VideoView
          player={videoPlayer}
          style={styles.video}
          allowsFullscreen
          allowsPictureInPicture
        />
      </View>
    );
  }

  // Audio player — light green "mine" bubbles need dark controls (not white-on-white).
  const accent = '#128C7E';
  const duration = audioStatus?.duration || audioPlayer.duration || 0;
  const currentTime = audioStatus.currentTime || 0;
  const isPlaying = audioPlayer.playing;
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const togglePlay = () => {
    if (isPlaying) {
      audioPlayer.pause();
    } else {
      audioPlayer.play();
    }
  };

  return (
    <View
      style={[
        styles.audioContainer,
        { backgroundColor: isMine ? 'rgba(18,140,126,0.12)' : '#f3f4f6' },
      ]}
    >
      <Pressable onPress={togglePlay} style={styles.playButton}>
        <Ionicons
          name={isPlaying ? 'pause' : 'play'}
          size={22}
          color={accent}
          style={!isPlaying && { marginLeft: 3 }}
        />
      </Pressable>

      <View style={styles.audioTrackContainer}>
        <View style={[styles.audioTrack, { backgroundColor: 'rgba(18, 140, 126, 0.25)' }]}>
          <View
            style={[styles.audioProgress, { width: `${progress}%`, backgroundColor: accent }]}
          />
        </View>
        <Text style={[styles.timeText, { color: '#4B5563' }]}>
          {isPlaying ? formatTime(currentTime) : formatTime(duration)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  videoContainer: {
    width: 220,
    height: 160,
    borderRadius: 8,
    overflow: 'hidden',
    marginTop: 4,
  },
  video: {
    width: '100%',
    height: '100%',
  },
  audioContainer: {
    width: 240,
    height: 56,
    borderRadius: 28,
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  audioTrackContainer: {
    flex: 1,
    marginLeft: 10,
    justifyContent: 'center',
  },
  audioTrack: {
    height: 4,
    borderRadius: 2,
    width: '100%',
    overflow: 'hidden',
  },
  audioProgress: {
    height: '100%',
    borderRadius: 2,
  },
  timeText: {
    fontSize: 11,
    marginTop: 4,
    fontWeight: '500',
  },
});
