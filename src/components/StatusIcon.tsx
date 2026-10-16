import React, { useEffect, useMemo } from 'react';
import { ImageSourcePropType, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

interface StatusIconProps {
  color: string;
  icon?: keyof typeof Ionicons.glyphMap;
  imageSource?: ImageSourcePropType;
  /** Force pulse rings (pending / processing) */
  pulse?: boolean;
}

type MotionType = 'drive' | 'spin' | 'time' | 'none';

function getMotionType(icon?: string, hasImage?: boolean): MotionType {
  if (hasImage) return 'none';
  if (!icon) return 'none';
  if (
    icon.includes('car') ||
    icon.includes('bus') ||
    icon.includes('bicycle') ||
    icon.includes('airplane')
  ) {
    return 'drive';
  }
  if (icon.includes('sync') || icon.includes('refresh')) {
    return 'spin';
  }
  if (icon.includes('time')) {
    return 'time';
  }
  return 'none';
}

function shouldPulse(icon: string | undefined, pulseProp?: boolean) {
  if (typeof pulseProp === 'boolean') return pulseProp;
  if (!icon) return false;
  return (
    icon.includes('time') ||
    icon.includes('sync') ||
    icon.includes('refresh') ||
    icon.includes('storefront')
  );
}

export function StatusIcon({
  color,
  icon = 'ellipse',
  imageSource,
  pulse: pulseProp,
}: StatusIconProps) {
  const pulseA = useSharedValue(1);
  const pulseB = useSharedValue(1);
  const pulseC = useSharedValue(1);
  const iconMotion = useSharedValue(0);
  const hasImage = Boolean(imageSource);
  const pulse = shouldPulse(icon, pulseProp);
  const motionType = useMemo(() => getMotionType(icon, hasImage), [icon, hasImage]);

  useEffect(() => {
    if (pulse) {
      // Multiple concentric rings — staggered, like the earlier look
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

    if (motionType === 'drive') {
      iconMotion.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 700, easing: Easing.inOut(Easing.ease) }),
          withTiming(-1, { duration: 700, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 500, easing: Easing.inOut(Easing.ease) }),
          withDelay(250, withTiming(0, { duration: 1 })),
        ),
        -1,
        false,
      );
    } else if (motionType === 'spin') {
      iconMotion.value = withRepeat(
        withTiming(1, { duration: 1400, easing: Easing.linear }),
        -1,
        false,
      );
    } else if (motionType === 'time') {
      iconMotion.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 450, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 450, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        false,
      );
    } else {
      iconMotion.value = 0;
    }
  }, [icon, pulse, motionType]);

  const ringAStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseA.value }],
  }));
  const ringBStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseB.value }],
  }));
  const ringCStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseC.value }],
  }));

  const animatedIcon = useAnimatedStyle(() => {
    if (motionType === 'drive') {
      return {
        transform: [{ translateX: iconMotion.value * 5 }, { rotate: `${iconMotion.value * 4}deg` }],
      };
    }
    if (motionType === 'spin') {
      return {
        transform: [{ rotate: `${iconMotion.value * 360}deg` }],
      };
    }
    if (motionType === 'time') {
      return {
        opacity: 0.72 + iconMotion.value * 0.28,
        transform: [{ scale: 0.94 + iconMotion.value * 0.08 }],
      };
    }
    return {};
  }, [motionType]);

  const coreBg = hasImage ? '#FFFFFF' : color;

  const ringBase = {
    position: 'absolute' as const,
    borderRadius: 999,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  };

  return (
    <View className="items-center">
      <View
        style={{
          alignItems: 'center',
          height: 104,
          justifyContent: 'center',
          width: 104,
        }}
      >
        {/* 3 pulse rings (outer → mid → near) — stable core stays unscaled */}
        {pulse ? (
          <>
            <Animated.View
              pointerEvents="none"
              style={[
                ringBase,
                {
                  backgroundColor: color + '28',
                  height: 104,
                  width: 104,
                },
                ringCStyle,
              ]}
            />
            <Animated.View
              pointerEvents="none"
              style={[
                ringBase,
                {
                  backgroundColor: color + '38',
                  height: 88,
                  width: 88,
                },
                ringBStyle,
              ]}
            />
            <Animated.View
              pointerEvents="none"
              style={[
                ringBase,
                {
                  backgroundColor: color + '48',
                  height: 76,
                  width: 76,
                },
                ringAStyle,
              ]}
            />
          </>
        ) : (
          <>
            <View
              pointerEvents="none"
              style={[
                ringBase,
                {
                  backgroundColor: color + '20',
                  height: 104,
                  width: 104,
                },
              ]}
            />
            <View
              pointerEvents="none"
              style={[
                ringBase,
                {
                  backgroundColor: color + '30',
                  height: 80,
                  width: 80,
                },
              ]}
            />
          </>
        )}

        <View
          style={{
            alignItems: 'center',
            backgroundColor: coreBg,
            borderColor: hasImage ? `${color}35` : 'transparent',
            borderRadius: 999,
            borderWidth: hasImage ? 1.5 : 0,
            elevation: hasImage ? 3 : 0,
            height: 68,
            justifyContent: 'center',
            shadowColor: color,
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: hasImage ? 0.18 : 0,
            shadowRadius: 6,
            width: 68,
            zIndex: 2,
          }}
        >
          <Animated.View style={animatedIcon}>
            {hasImage ? (
              <Image
                source={imageSource}
                style={{ width: 44, height: 44 }}
                contentFit="contain"
                autoplay
              />
            ) : (
              <Ionicons name={icon} size={30} color="#fff" />
            )}
          </Animated.View>
        </View>
      </View>
    </View>
  );
}
