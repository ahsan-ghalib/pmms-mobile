import { Text } from './Text';

import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  TouchableOpacity,
  Image,
  ImageSourcePropType,
  Platform,
  Text as RNText,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

interface ImageActionCardProps {
  imageSource: ImageSourcePropType;
  iconBg: string;
  title: string;
  subtitle?: string;
  badgeCount?: number;
  alwaysShowBadge?: boolean;
  onPress: () => void;
  cardBg?: string;
}

function PulsingCountBadge({ count, color }: { count: number; color: string }) {
  const label = count > 99 ? '99+' : String(count);
  const ringA = useSharedValue(1);
  const ringB = useSharedValue(1);

  useEffect(() => {
    ringA.value = withRepeat(
      withTiming(1.45, { duration: 700, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
    ringB.value = withDelay(
      120,
      withRepeat(withTiming(1.65, { duration: 700, easing: Easing.inOut(Easing.ease) }), -1, true),
    );
  }, [ringA, ringB]);

  const ringAStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringA.value }],
  }));
  const ringBStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringB.value }],
  }));

  return (
    <View
      pointerEvents="none"
      style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}
    >
      <Animated.View
        style={[
          {
            position: 'absolute',
            height: 40,
            width: 40,
            borderRadius: 999,
            backgroundColor: color,
            opacity: 0.16,
          },
          ringBStyle,
        ]}
      />
      <Animated.View
        style={[
          {
            position: 'absolute',
            height: 40,
            width: 40,
            borderRadius: 999,
            backgroundColor: color,
            opacity: 0.28,
          },
          ringAStyle,
        ]}
      />
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: color,
          borderWidth: 2,
          borderColor: '#fff',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2,
          shadowColor: color,
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.3,
          shadowRadius: 4,
          elevation: 4,
        }}
      >
        <RNText
          allowFontScaling={false}
          style={{
            fontFamily: 'Inter_700Bold',
            fontSize: 15,
            lineHeight: 18,
            color: '#fff',
            textAlign: 'center',
            textAlignVertical: 'center',
            includeFontPadding: false,
            writingDirection: 'ltr',
          }}
        >
          {label}
        </RNText>
      </View>
    </View>
  );
}

export function ImageActionCard({
  imageSource,
  iconBg,
  title,
  subtitle,
  badgeCount,
  alwaysShowBadge = false,
  onPress,
  cardBg = '#ffffff',
}: ImageActionCardProps) {
  const { i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';
  const rowDirection = isArabic ? 'row-reverse' : 'row';
  const textAlignStr = isArabic ? 'right' : 'left';
  const showBadge = alwaysShowBadge ? badgeCount != null : (badgeCount ?? 0) > 0;

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      className={`${Platform.isPad ? 'w-[31.5%]' : 'w-[48%]'} h-40 rounded-3xl p-5 justify-between shadow-sm mb-4`}
      style={{
        backgroundColor: cardBg,
        borderStartWidth: 4,
        borderStartColor: iconBg,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
        overflow: 'visible',
      }}
    >
      <View
        className="items-center"
        style={{ direction: 'ltr', flexDirection: rowDirection, justifyContent: 'space-between' }}
      >
        <Image source={imageSource} style={{ width: 60, height: 60 }} resizeMode="contain" />
        {showBadge ? (
          <PulsingCountBadge count={badgeCount ?? 0} color={iconBg || '#8E54E9'} />
        ) : null}
      </View>

      <View
        className="items-end justify-between"
        style={{ direction: 'ltr', flexDirection: rowDirection }}
      >
        <View className="flex-1" style={{ direction: 'ltr', marginHorizontal: 8 }}>
          <Text
            className="text-sm font-extrabold text-gray-900 leading-tight mb-1"
            numberOfLines={2}
            style={{ textAlign: textAlignStr }}
          >
            {title}
          </Text>
          {subtitle ? (
            <Text
              className="text-[12px] text-gray-400"
              numberOfLines={1}
              style={{ textAlign: textAlignStr }}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>
        <View
          className="h-6 w-6 rounded-full bg-white items-center justify-center shadow-sm"
          style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.1,
            shadowRadius: 2,
            elevation: 2,
          }}
        >
          <Ionicons name={isArabic ? 'arrow-back' : 'arrow-forward'} size={12} color="#111827" />
        </View>
      </View>
    </TouchableOpacity>
  );
}
