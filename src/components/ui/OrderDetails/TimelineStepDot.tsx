import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

type Props = {
  color: string;
  done: boolean;
  /** Current in-progress step — concentric rings outside the stable circle */
  pulse?: boolean;
  icon: IconName;
  iconColor: string;
};

/**
 * Timeline rail marker — same pulse language as My Orders StatusIcon
 * (stable core + outer rings), scaled for the vertical timeline.
 */
export function TimelineStepDot({ color, done, pulse = false, icon, iconColor }: Props) {
  const pulseA = useSharedValue(1);
  const pulseB = useSharedValue(1);
  const pulseC = useSharedValue(1);

  useEffect(() => {
    if (pulse) {
      pulseA.value = withRepeat(
        withTiming(1.12, { duration: 700, easing: Easing.inOut(Easing.ease) }),
        -1,
        true,
      );
      pulseB.value = withDelay(
        120,
        withRepeat(
          withTiming(1.16, { duration: 620, easing: Easing.inOut(Easing.ease) }),
          -1,
          true,
        ),
      );
      pulseC.value = withDelay(
        220,
        withRepeat(withTiming(1.2, { duration: 560, easing: Easing.inOut(Easing.ease) }), -1, true),
      );
    } else {
      pulseA.value = 1;
      pulseB.value = 1;
      pulseC.value = 1;
    }
  }, [pulse, pulseA, pulseB, pulseC]);

  const ringAStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseA.value }],
  }));
  const ringBStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseB.value }],
  }));
  const ringCStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseC.value }],
  }));

  return (
    <View style={styles.wrap}>
      {pulse ? (
        <>
          <Animated.View
            pointerEvents="none"
            style={[
              styles.ring,
              { backgroundColor: color + '28', height: 58, width: 58 },
              ringCStyle,
            ]}
          />
          <Animated.View
            pointerEvents="none"
            style={[
              styles.ring,
              { backgroundColor: color + '38', height: 50, width: 50 },
              ringBStyle,
            ]}
          />
          <Animated.View
            pointerEvents="none"
            style={[
              styles.ring,
              { backgroundColor: color + '48', height: 44, width: 44 },
              ringAStyle,
            ]}
          />
        </>
      ) : null}

      <View
        style={[
          styles.outer,
          { borderColor: `${color}33` },
          done && { backgroundColor: `${color}18` },
        ]}
      >
        <View style={[styles.core, { backgroundColor: done ? color : '#E2E8F0' }]}>
          <Ionicons name={icon} size={18} color={iconColor} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    height: 42,
    justifyContent: 'center',
    overflow: 'visible',
    width: 42,
    zIndex: 2,
  },
  ring: {
    borderRadius: 999,
    position: 'absolute',
  },
  outer: {
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderRadius: 21,
    borderWidth: 2,
    height: 42,
    justifyContent: 'center',
    width: 42,
    zIndex: 2,
  },
  core: {
    alignItems: 'center',
    borderRadius: 14,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
});
