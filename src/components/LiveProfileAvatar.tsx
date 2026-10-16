import React, { useEffect, useRef } from 'react';
import {
  View,
  Image,
  Text,
  Animated,
  StyleSheet,
  ImageSourcePropType,
  StyleProp,
  ViewStyle,
  Easing,
} from 'react-native';

type LiveProfileAvatarProps = {
  uri?: string | null;
  size?: number;
  isLive?: boolean;
  showBadge?: boolean;
  /** Soft purple pulse when the vendor is not live (shop detail style). */
  pulseWhenInactive?: boolean;
  inactiveBorderWidth?: number;
  inactiveBorderColor?: string;
  fallbackSource?: ImageSourcePropType;
  style?: StyleProp<ViewStyle>;
};

const LIVE_RED = '#E11D48';

/**
 * Live profile: red rings around avatar + zoom in/out + LIVE badge overlaid on avatar.
 * Optional inactive purple pulse when not live.
 */
export function LiveProfileAvatar({
  uri,
  size = 56,
  isLive = false,
  showBadge = true,
  pulseWhenInactive = false,
  inactiveBorderWidth = 2,
  inactiveBorderColor = '#A020F0',
  fallbackSource = require('../../assets/images/profile.png'),
  style,
}: LiveProfileAvatarProps) {
  const ringPulse = useRef(new Animated.Value(0)).current;
  const zoom = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    ringPulse.stopAnimation();
    zoom.stopAnimation();
    ringPulse.setValue(0);
    zoom.setValue(1);

    if (isLive) {
      const ringLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(ringPulse, {
            toValue: 1,
            duration: 750,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(ringPulse, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
      );

      const zoomLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(zoom, {
            toValue: 1.1,
            duration: 450,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(zoom, {
            toValue: 1,
            duration: 450,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      );

      ringLoop.start();
      zoomLoop.start();

      return () => {
        ringLoop.stop();
        zoomLoop.stop();
      };
    }

    if (pulseWhenInactive) {
      const inactiveZoom = Animated.loop(
        Animated.sequence([
          Animated.timing(zoom, {
            toValue: 1.08,
            duration: 350,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(zoom, {
            toValue: 1,
            duration: 350,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      );

      inactiveZoom.start();

      return () => {
        inactiveZoom.stop();
      };
    }

    return undefined;
  }, [isLive, pulseWhenInactive, ringPulse, zoom]);

  const showInactivePulse = !isLive && pulseWhenInactive;
  const ringPad = isLive ? 14 : 0;
  const stage = size + ringPad * 2;
  const ringSize = size + 6;

  const ringScale = ringPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.4],
  });
  const ringOpacity = ringPulse.interpolate({
    inputRange: [0, 0.15, 1],
    outputRange: [1, 0.55, 0],
  });

  return (
    <View
      style={[
        { width: stage, height: stage, alignItems: 'center', justifyContent: 'center' },
        style,
      ]}
    >
      <View style={[styles.stage, { width: stage, height: stage }]}>
        {isLive ? (
          <>
            <Animated.View
              pointerEvents="none"
              style={[
                styles.ring,
                {
                  width: ringSize,
                  height: ringSize,
                  borderRadius: ringSize / 2,
                  borderWidth: 2.5,
                  borderColor: LIVE_RED,
                  opacity: ringOpacity,
                  transform: [{ scale: ringScale }],
                },
              ]}
            />
            <View
              pointerEvents="none"
              style={[
                styles.ring,
                {
                  width: size + 4,
                  height: size + 4,
                  borderRadius: (size + 4) / 2,
                  borderWidth: 3,
                  borderColor: LIVE_RED,
                  opacity: 1,
                },
              ]}
            />
          </>
        ) : null}

        <Animated.View
          style={[
            styles.avatarWrap,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              borderWidth: isLive ? 2.5 : inactiveBorderWidth,
              borderColor: isLive ? '#FFFFFF' : inactiveBorderColor,
              transform: isLive || showInactivePulse ? [{ scale: zoom }] : [],
            },
          ]}
        >
          <Image
            source={uri ? { uri } : fallbackSource}
            style={{
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: '#222',
            }}
          />
          {isLive ? <View style={styles.onlineDot} /> : null}
        </Animated.View>

        {isLive && showBadge ? (
          <View style={[styles.badge, { bottom: ringPad - 2 }]}>
            <Text style={styles.badgeText}>LIVE</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
  },
  avatarWrap: {
    overflow: 'hidden',
    backgroundColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  onlineDot: {
    position: 'absolute',
    top: 3,
    left: 3,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#22C55E',
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  badge: {
    position: 'absolute',
    alignSelf: 'center',
    zIndex: 4,
    backgroundColor: LIVE_RED,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
});
