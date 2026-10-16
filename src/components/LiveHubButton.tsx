import React, { useEffect, useRef } from 'react';
import { View, Image, Animated, StyleSheet, TouchableOpacity, Easing } from 'react-native';

type LiveHubButtonProps = {
  size?: number;
  /** When false: no pulse, not pressable — still looks original (not dimmed). */
  active?: boolean;
  onPress?: () => void;
};

const LIVE_ORANGE = '#F5A623';

/** Top-bar live logo — pulse only when someone is live; never looks “disabled”. */
export function LiveHubButton({ size = 48, active = false, onPress }: LiveHubButtonProps) {
  const ring1 = useRef(new Animated.Value(0)).current;
  const ring2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!active) {
      ring1.stopAnimation();
      ring2.stopAnimation();
      ring1.setValue(0);
      ring2.setValue(0);
      return;
    }

    const makeLoop = (value: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(value, {
            toValue: 1,
            duration: 1400,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(value, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
      );

    const a1 = makeLoop(ring1, 0);
    const a2 = makeLoop(ring2, 450);
    a1.start();
    a2.start();
    return () => {
      a1.stop();
      a2.stop();
    };
  }, [active, ring1, ring2]);

  const pad = 14;
  const wrap = size + pad * 2;

  const ringStyle = (anim: Animated.Value, maxScale: number) => ({
    position: 'absolute' as const,
    width: size + 6,
    height: size + 6,
    borderRadius: (size + 6) / 2,
    borderWidth: 2,
    borderColor: LIVE_ORANGE,
    opacity: anim.interpolate({
      inputRange: [0, 0.3, 1],
      outputRange: [0.95, 0.45, 0],
    }),
    transform: [
      {
        scale: anim.interpolate({
          inputRange: [0, 1],
          outputRange: [1, maxScale],
        }),
      },
    ],
  });

  return (
    <TouchableOpacity
      activeOpacity={active ? 0.85 : 1}
      onPress={active ? onPress : undefined}
      disabled={!active}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      style={{ width: wrap, height: wrap }}
    >
      <View style={[styles.center, { width: wrap, height: wrap }]}>
        {active ? (
          <>
            <Animated.View pointerEvents="none" style={ringStyle(ring2, 1.5)} />
            <Animated.View pointerEvents="none" style={ringStyle(ring1, 1.28)} />
          </>
        ) : null}

        <Image
          source={require('../../assets/images/live-logo.png')}
          style={{
            width: size,
            height: size,
            zIndex: 2,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.65,
            shadowRadius: 2.5,
          }}
          resizeMode="contain"
        />
        {active ? <View style={styles.onlineDot} /> : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  onlineDot: {
    position: 'absolute',
    top: 14,
    left: 14,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#22C55E',
    borderWidth: 1.5,
    borderColor: '#fff',
    zIndex: 3,
  },
});
