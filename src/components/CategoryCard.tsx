import { Text } from './Text';

import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

interface CategoryCardProps {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  image?: string | null;
  bg: string;
  color: string;
  selected?: boolean;
  onPress: () => void;
}

export function CategoryCard({
  label,
  icon,
  bg,
  color,
  image,
  selected = false,
  onPress,
}: CategoryCardProps) {
  const { i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      className="mr-4 w-36 h-48 rounded-3xl p-4 justify-center items-center"
      style={{
        backgroundColor: bg,
        borderColor: selected ? color : 'transparent',
        borderWidth: 2,
      }}
    >
      <View className="w-full items-center justify-center flex-1">
        {image ? (
          <Image source={{ uri: image }} style={{ width: 100, height: 100 }} contentFit="contain" />
        ) : (
          <Ionicons name={icon} size={32} color={color} />
        )}
      </View>
      <Text
        className="mt-3 text-base text-center font-bold text-gray-800 leading-5"
        numberOfLines={2}
      >
        {label}
      </Text>
      {/* <View className="self-end h-8 w-8 rounded-full bg-white items-center justify-center shadow-sm">
        <Ionicons 
          name="arrow-forward" 
          size={16} 
          color="#111827" 
          style={{ transform: [{ scaleX: isRTL ? -1 : 1 }] }}
        />
      </View> */}
    </TouchableOpacity>
  );
}
