import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, Animated, Platform, StyleSheet, View } from 'react-native';

/**
 * Full-screen home refresh cover: solid black + chrome bones + centered loader.
 * Rendered in a Modal so native feed cannot clip or draw above it.
 */
export function FeedReelSkeleton() {
  const pulse = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.85, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.45, duration: 700, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [pulse]);

  const bone = (style: object, key?: string) => (
    <Animated.View key={key} style={[style, { opacity: pulse }]} />
  );

  return (
    <View style={styles.root} pointerEvents="none" collapsable={false}>
      <View style={styles.base} />

      <View style={styles.topLeft}>{bone(styles.logoBone)}</View>
      <View style={styles.topRight}>{bone(styles.circle44, 'hub')}</View>

      <View style={styles.sideFilters}>
        {bone(styles.circle44, 'f1')}
        {bone(styles.circle44, 'f2')}
        {bone(styles.circle44, 'f3')}
      </View>

      <View style={styles.sideActions}>
        {bone(styles.avatar, 'av')}
        {bone(styles.circle44, 'a1')}
        {bone(styles.circle44, 'a2')}
        {bone(styles.circle44, 'a3')}
      </View>

      {/* Caption band — same as NativeHomeFeed bottomOverlay */}
      <View style={styles.bottomCaption}>
        {bone(styles.lineWide)}
        {bone(styles.lineNarrow)}
      </View>
      {/* Scrubber band — matches native FeedCell (below caption, above tab bar) */}
      {bone(styles.scrubber)}

      <View style={styles.centerLoader}>
        <ActivityIndicator size="large" color="#FFFFFF" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    width: '100%',
    backgroundColor: '#000000',
    direction: 'ltr',
  },
  base: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
  },
  topLeft: {
    position: 'absolute',
    top: 52,
    left: 6,
    height: 70,
    justifyContent: 'center',
  },
  topRight: {
    position: 'absolute',
    top: 52,
    right: 6,
    width: 48,
    alignItems: 'center',
  },
  // Match NativeHomeFeed — filters right, actions left.
  sideFilters: {
    position: 'absolute',
    top: 120,
    right: 6,
    width: 48,
    alignItems: 'center',
  },
  sideActions: {
    position: 'absolute',
    left: 6,
    bottom: Platform.isPad ? 220 : 175,
    width: 48,
    alignItems: 'center',
  },
  bottomCaption: {
    position: 'absolute',
    left: 14,
    right: 14,
    // NativeHomeFeed bottomOverlay uses bottom: 80 + paddingBottom: 44 for scrubber gap.
    // Sit a touch lower so bones line up with the live caption once the cover drops.
    bottom: Platform.isPad ? 96 : 66,
    paddingBottom: 44,
    justifyContent: 'flex-end',
  },
  logoBone: {
    width: 120,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  circle44: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginBottom: 8,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.24)',
    marginBottom: 10,
  },
  lineWide: {
    height: 14,
    width: '58%',
    borderRadius: 7,
    backgroundColor: 'rgba(255,255,255,0.26)',
    marginBottom: 10,
  },
  lineNarrow: {
    height: 11,
    width: '36%',
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  scrubber: {
    position: 'absolute',
    left: 14,
    right: 14,
    // FeedCell: bottomPad ≈ 80, wrapper 36 — bar sits near the lower third of that band.
    bottom: Platform.isPad ? 52 : 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  centerLoader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
