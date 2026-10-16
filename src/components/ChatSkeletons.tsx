import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

const SHAPE = '#E8E4F0';

function usePulse() {
  const pulse = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.9, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.45, duration: 700, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [pulse]);

  return pulse;
}

function Bone({ style }: { style: object }) {
  const pulse = usePulse();
  return <Animated.View style={[styles.bone, style, { opacity: pulse }]} />;
}

export function ConversationListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <View>
      {Array.from({ length: count }, (_, index) => (
        <View key={`conv-skel-${index}`} style={styles.convCard}>
          <Bone style={styles.convAvatar} />
          <View style={styles.convBody}>
            <View style={styles.convTopRow}>
              <Bone style={styles.convName} />
              <Bone style={styles.convDate} />
            </View>
            <Bone style={styles.convPreview} />
          </View>
        </View>
      ))}
    </View>
  );
}

const BUBBLES = [
  { mine: false, width: '68%' },
  { mine: true, width: '54%' },
  { mine: false, width: '74%' },
  { mine: true, width: '42%' },
  { mine: false, width: '60%' },
  { mine: true, width: '70%' },
] as const;

export function ChatBubblesSkeleton({ padded = true }: { padded?: boolean }) {
  return (
    <View style={[styles.bubblesWrap, !padded && { paddingHorizontal: 0 }]}>
      {BUBBLES.map((bubble, index) => (
        <View
          key={`bubble-skel-${index}`}
          style={[styles.bubbleRow, bubble.mine ? styles.bubbleRowMine : styles.bubbleRowTheirs]}
        >
          <Bone
            style={[
              styles.bubble,
              { width: bubble.width as `${number}%` },
              bubble.mine ? styles.bubbleMine : styles.bubbleTheirs,
            ]}
          />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  bone: {
    backgroundColor: SHAPE,
  },
  convCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  convAvatar: {
    width: 56,
    height: 56,
    borderRadius: 16,
  },
  convBody: {
    flex: 1,
    marginLeft: 16,
  },
  convTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  convName: {
    width: '48%',
    height: 14,
    borderRadius: 7,
  },
  convDate: {
    width: 64,
    height: 10,
    borderRadius: 5,
  },
  convPreview: {
    width: '72%',
    height: 12,
    borderRadius: 6,
  },
  bubblesWrap: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  bubbleRow: {
    marginBottom: 12,
    width: '100%',
  },
  bubbleRowMine: {
    alignItems: 'flex-end',
  },
  bubbleRowTheirs: {
    alignItems: 'flex-start',
  },
  bubble: {
    height: 44,
    borderRadius: 16,
  },
  bubbleMine: {
    backgroundColor: '#D9F0C8',
    borderBottomRightRadius: 4,
  },
  bubbleTheirs: {
    backgroundColor: '#E8E4F0',
    borderBottomLeftRadius: 4,
  },
});
