import { Text } from '../Text';

import React from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BackIcon } from './BackButton';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

export interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  rightIcon?: string;
  onRightIconPress?: () => void;
  rightContent?: React.ReactNode;
  boxed?: boolean;
}

export function ScreenHeader({
  title,
  subtitle,
  rightIcon,
  onRightIconPress,
  rightContent,
  boxed = false,
}: ScreenHeaderProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { i18n, t } = useTranslation();
  const isArabic = Boolean(i18n.language?.startsWith('ar'));
  const hasRightActions = Boolean(rightContent || rightIcon);

  const backButton = (
    <Pressable
      onPress={() => router.back()}
      accessibilityRole="button"
      accessibilityLabel={t('back', 'Back')}
      hitSlop={8}
      className={`h-12 w-12 items-center justify-center bg-white ${boxed ? 'rounded-2xl border border-[#F1F2F6]' : 'rounded-full'}`}
      style={{
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: boxed ? 0.08 : 0.05,
        shadowRadius: 8,
        elevation: 2,
      }}
    >
      <BackIcon size={24} color="#8E54E9" />
    </Pressable>
  );

  const actionsSlot = rightContent ? (
    rightContent
  ) : rightIcon ? (
    <Pressable
      accessibilityRole="button"
      hitSlop={8}
      className={`h-12 w-12 items-center justify-center ${boxed ? 'rounded-2xl border border-[#F1F2F6] bg-white' : 'rounded-full bg-[#F9F5FF]'}`}
      onPress={onRightIconPress}
    >
      <Ionicons name={rightIcon as any} size={22} color="#8E54E9" />
    </Pressable>
  ) : (
    <View className="w-[52px]" />
  );

  const titleBlock = (
    <View
      pointerEvents="none"
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: 8,
        minWidth: 0,
      }}
    >
      <Text
        className="text-[20px] font-extrabold text-[#111827] mb-0.5 text-center"
        numberOfLines={1}
      >
        {title}
      </Text>
      {subtitle ? (
        <Text className="text-[12px] text-gray-500 font-medium text-center" numberOfLines={1}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );

  return (
    <View
      style={{
        // Keep LTR layout direction so our explicit Arabic child order
        // (actions left, back right) is not flipped again by I18nManager RTL.
        direction: 'ltr',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingLeft: 20,
        paddingRight: 20,
        paddingTop: insets.top + 16,
        paddingBottom: 20,
      }}
    >
      {isArabic ? (
        <>
          <View className="z-10">{actionsSlot}</View>
          {titleBlock}
          <View className="z-10 w-[52px] items-end">{backButton}</View>
        </>
      ) : (
        <>
          <View className="z-10 w-[52px] items-start">{backButton}</View>
          {titleBlock}
          <View className={`z-10 ${hasRightActions ? '' : 'w-[52px] items-end'}`}>
            {actionsSlot}
          </View>
        </>
      )}
    </View>
  );
}
