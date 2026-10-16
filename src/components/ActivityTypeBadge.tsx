import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './Text';

interface ActivityTypeBadgeProps {
  label: string;
  image?: string | null;
  icon?: string | null;
  selected?: boolean;
  onPress: () => void;
}

export function ActivityTypeBadge({
  label,
  image,
  icon,
  selected = false,
  onPress,
}: ActivityTypeBadgeProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      className={`flex-row items-center justify-center px-4 py-2 rounded-full border mr-3 ${selected ? 'border-[#8E54E9] bg-[#F9F5FF]' : 'border-gray-200 bg-white'}`}
      style={{
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
      }}
    >
      {icon && icon in Ionicons.glyphMap && (
        <Ionicons
          name={icon as keyof typeof Ionicons.glyphMap}
          size={22}
          color={selected ? '#8E54E9' : '#6B7280'}
          style={{ marginRight: 8 }}
        />
      )}
      {(!icon || !(icon in Ionicons.glyphMap)) && image && (
        <Image
          source={{ uri: image }}
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            marginRight: 8,
            backgroundColor: '#f3f4f6',
          }}
          contentFit="cover"
        />
      )}
      <Text className={`text-lg font-semibold ${selected ? 'text-[#8E54E9]' : 'text-gray-700'}`}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}
