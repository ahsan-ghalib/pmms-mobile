import { Text } from './Text';

import React, { useEffect } from 'react';
import { TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

interface IconButtonProps {
  bgColor?: string;
  iconColor?: string;
  badgeColor?: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  badgeCount?: number;
  badgeDot?: boolean;
  /** Soft outer rings pulse when count > 0 — badge number stays still */
  pulseBadge?: boolean;
}

export function IconButton({
  icon,
  onPress,
  badgeCount,
  badgeDot,
  pulseBadge = false,
  bgColor = '#F3E8FF',
  iconColor = '#8E54E9',
  badgeColor = '#7C3AED',
}: IconButtonProps) {
  const showCount = badgeCount !== undefined && badgeCount > 0;
  const shouldPulse = pulseBadge && showCount;

  const ringA = useSharedValue(1);
  const ringB = useSharedValue(1);

  useEffect(() => {
    if (!shouldPulse) {
      ringA.value = 1;
      ringB.value = 1;
      return;
    }

    // Quiet dual-ring pulse — a bit snappier than order-list default
    ringA.value = withRepeat(
      withTiming(1.35, { duration: 650, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
    ringB.value = withDelay(
      100,
      withRepeat(withTiming(1.45, { duration: 520, easing: Easing.inOut(Easing.ease) }), -1, true),
    );
  }, [shouldPulse, ringA, ringB]);

  const ringAStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringA.value }],
  }));

  const ringBStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringB.value }],
  }));

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      className="relative h-12 w-12 items-center justify-center rounded-full shadow-sm"
      style={{
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
        backgroundColor: bgColor,
      }}
    >
      <Ionicons name={icon} size={24} color={iconColor} />
      {showCount && (
        <View
          pointerEvents="none"
          className="absolute -right-1 -top-1 z-10 items-center justify-center"
          style={{ minWidth: 24, minHeight: 24 }}
        >
          {shouldPulse && (
            <>
              <Animated.View
                style={[
                  {
                    position: 'absolute',
                    height: 24,
                    width: 24,
                    borderRadius: 999,
                    backgroundColor: badgeColor,
                    opacity: 0.22,
                  },
                  ringBStyle,
                ]}
              />
              <Animated.View
                style={[
                  {
                    position: 'absolute',
                    height: 24,
                    width: 24,
                    borderRadius: 999,
                    backgroundColor: badgeColor,
                    opacity: 0.35,
                  },
                  ringAStyle,
                ]}
              />
            </>
          )}
          {/* Stable core — number does not pulse */}
          <View
            className="h-6 min-w-[24px] px-1 justify-center items-center rounded-full border-2 overflow-visible"
            style={{
              minWidth: 24,
              minHeight: 24,
              borderColor: bgColor,
              borderWidth: 2,
              backgroundColor: badgeColor,
              zIndex: 2,
            }}
          >
            <Text
              className="text-[12px] font-bold text-white text-center"
              style={{
                textAlign: 'center',
                includeFontPadding: false,
                alignSelf: 'center',
                width: '100%',
                marginTop: -1,
              }}
              adjustsFontSizeToFit
              numberOfLines={1}
            >
              {badgeCount}
            </Text>
          </View>
        </View>
      )}
      {badgeDot && !showCount && (
        <View
          className="absolute right-0 top-0 h-3 w-3 rounded-full border-2"
          style={{ backgroundColor: badgeColor, borderColor: bgColor }}
        />
      )}
    </TouchableOpacity>
  );
}
