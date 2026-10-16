import React from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useVideoPlayer, VideoView } from 'expo-video';

export type MediaKind = 'image' | 'video' | 'audio' | 'file';

export function getMediaKind(uri: string, mimeType?: string, type?: string): MediaKind {
  const mime = String(mimeType || type || '').toLowerCase();
  const path = String(uri || '')
    .split('?')[0]
    .split('#')[0]
    .toLowerCase();
  if (mime.startsWith('image') || type === 'image' || path.match(/\.(jpe?g|png|gif|webp|heic)$/)) {
    return 'image';
  }
  if (mime.startsWith('video') || type === 'video' || path.match(/\.(mp4|mov|avi|mkv|webm)$/)) {
    return 'video';
  }
  if (mime.startsWith('audio') || type === 'audio' || path.match(/\.(mp3|wav|m4a|aac|caf)$/)) {
    return 'audio';
  }
  return 'file';
}

function LightboxVideo({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (next) => {
    next.loop = false;
    next.muted = false;
  });
  return (
    <VideoView
      player={player}
      style={styles.lightboxVideo}
      nativeControls
      contentFit="contain"
      allowsFullscreen
    />
  );
}

function VideoThumb({ uri, style }: { uri: string; style: object }) {
  const player = useVideoPlayer(uri, (next) => {
    next.loop = false;
    next.muted = true;
    next.pause();
  });
  return (
    <VideoView
      player={player}
      style={style}
      nativeControls={false}
      contentFit="cover"
      pointerEvents="none"
    />
  );
}

export function MediaLightbox({
  uri,
  kind,
  onClose,
}: {
  uri: string | null;
  kind: 'image' | 'video' | null;
  onClose: () => void;
}) {
  if (!uri || !kind) {
    return null;
  }

  return (
    <Modal visible animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.lightboxRoot}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        {kind === 'image' ? (
          <Image source={{ uri }} style={styles.lightboxImage} resizeMode="contain" />
        ) : (
          <LightboxVideo uri={uri} />
        )}
        <Pressable style={styles.lightboxClose} onPress={onClose} hitSlop={12}>
          <Ionicons name="close" size={22} color="#fff" />
        </Pressable>
      </View>
    </Modal>
  );
}

export function ComposerAttachmentStrip({
  attachments,
  onRemove,
  onOpen,
}: {
  attachments: any[];
  onRemove: (index: number) => void;
  onOpen: (uri: string, kind: 'image' | 'video') => void;
}) {
  if (!attachments.length) {
    return null;
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.strip}
    >
      {attachments.map((att, index) => {
        const uri = att.uri || att.url || '';
        const kind = getMediaKind(uri, att.mimeType, att.type);
        return (
          <View key={`${uri}-${index}`} style={styles.thumbWrap}>
            <Pressable
              onPress={() => {
                if ((kind === 'image' || kind === 'video') && uri) {
                  onOpen(uri, kind);
                }
              }}
              style={styles.thumb}
            >
              {kind === 'image' && uri ? (
                <Image source={{ uri }} style={styles.thumbImage} resizeMode="cover" />
              ) : kind === 'video' && uri ? (
                <View style={styles.videoThumb}>
                  <VideoThumb uri={uri} style={StyleSheet.absoluteFillObject} />
                  <Ionicons name="play-circle" size={28} color="#fff" />
                </View>
              ) : (
                <View style={styles.fileThumb}>
                  <Ionicons name="document-outline" size={22} color="#4B5563" />
                  <Text numberOfLines={1} style={styles.fileName}>
                    {att.name || att.fileName || 'File'}
                  </Text>
                </View>
              )}
              {kind === 'video' ? (
                <View style={styles.videoBadge}>
                  <Ionicons name="videocam" size={10} color="#fff" />
                </View>
              ) : null}
            </Pressable>
            <Pressable style={styles.remove} onPress={() => onRemove(index)} hitSlop={8}>
              <Ionicons name="close-circle" size={20} color="#DC2626" />
            </Pressable>
          </View>
        );
      })}
    </ScrollView>
  );
}

export function ChatMediaThumb({
  url,
  kind,
  onOpen,
}: {
  url: string;
  kind: 'image' | 'video';
  onOpen: (uri: string, kind: 'image' | 'video') => void;
}) {
  return (
    <Pressable onPress={() => onOpen(url, kind)} style={styles.messageThumb}>
      {kind === 'image' ? (
        <Image source={{ uri: url }} style={styles.messageImage} resizeMode="cover" />
      ) : (
        <View style={styles.messageVideo}>
          <VideoThumb uri={url} style={StyleSheet.absoluteFillObject} />
          <Ionicons name="play-circle" size={42} color="#fff" />
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  strip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
  },
  thumbWrap: {
    width: 76,
    height: 76,
  },
  thumb: {
    width: 76,
    height: 76,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#E5E7EB',
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  videoThumb: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111827',
  },
  videoBadge: {
    position: 'absolute',
    left: 6,
    bottom: 6,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  fileThumb: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  fileName: {
    marginTop: 4,
    fontSize: 9,
    color: '#4B5563',
    maxWidth: 64,
  },
  remove: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#fff',
    borderRadius: 10,
  },
  lightboxRoot: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.94)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lightboxImage: {
    width: '100%',
    height: '80%',
  },
  lightboxVideo: {
    width: '100%',
    height: 280,
  },
  lightboxClose: {
    position: 'absolute',
    top: 56,
    right: 18,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageThumb: {
    marginTop: 4,
    borderRadius: 8,
    overflow: 'hidden',
  },
  messageImage: {
    width: 200,
    height: 150,
  },
  messageVideo: {
    width: 200,
    height: 150,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
