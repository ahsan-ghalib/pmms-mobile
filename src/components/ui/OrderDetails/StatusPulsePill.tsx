import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { Text } from '../../../components/Text';

type Props = {
  color: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
};

/** Quiet dual-ring pulse (same motion language as My Orders StatusIcon) */
export function StatusPulsePill({ color, icon, label }: Props) {
  const pulseOuter = useSharedValue(1);
  const pulseInner = useSharedValue(1);

  useEffect(() => {
    pulseOuter.value = withRepeat(
      withTiming(1.06, { duration: 1100, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
    pulseInner.value = withRepeat(
      withTiming(1.1, { duration: 900, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [pulseOuter, pulseInner]);

  const animatedOuter = useAnimatedStyle(() => ({
    transform: [{ scale: pulseOuter.value }],
  }));

  const animatedInner = useAnimatedStyle(() => ({
    transform: [{ scale: pulseInner.value }],
  }));

  return (
    <View style={styles.wrap}>
      <Animated.View
        pointerEvents="none"
        style={[styles.ringOuter, { backgroundColor: color + '18' }, animatedOuter]}
      />
      <Animated.View
        pointerEvents="none"
        style={[styles.ringInner, { backgroundColor: color + '28' }, animatedInner]}
      />
      <View style={[styles.pill, { backgroundColor: color }]}>
        <Ionicons name={icon} size={12} color="#FFFFFF" />
        <Text style={styles.label}>{label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    justifyContent: 'center',
    paddingHorizontal: 6,
    paddingVertical: 5,
  },
  ringOuter: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 999,
  },
  ringInner: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 999,
    bottom: 3,
    left: 3,
    right: 3,
    top: 3,
  },
  pill: {
    alignItems: 'center',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 6,
    zIndex: 2,
  },
  label: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
    lineHeight: 16,
  },
});
