import { Text } from './Text';

import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useIsRTL } from '../hooks/useIsRTL';

interface ActionCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: string;
  iconColor?: string;
  title: string;
  subtitle: string;
  onPress: () => void;
}

export function ActionCard({
  icon,
  iconBg,
  iconColor = '#FFFFFF',
  title,
  subtitle,
  onPress,
}: ActionCardProps) {
  const isRTL = useIsRTL();

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      className="w-[48%] h-40 rounded-3xl bg-white p-5 justify-between shadow-sm mb-4"
      style={{
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
      }}
    >
      <View className="flex-row justify-between items-start">
        <View
          className="h-14 w-14 rounded-full items-center justify-center"
          style={{ backgroundColor: iconBg }}
        >
          <Ionicons name={icon} size={28} color={iconColor} style={{ textAlign: 'center' }} />
        </View>
      </View>

      <View className="flex-row items-end justify-between">
        <View className="flex-1 mr-2">
          <Text
            className="text-sm font-extrabold text-gray-900 leading-tight mb-1"
            numberOfLines={1}
          >
            {title}
          </Text>
          <Text className="text-[12px] text-gray-400" numberOfLines={1}>
            {subtitle}
          </Text>
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
          <Ionicons name={isRTL ? 'arrow-back' : 'arrow-forward'} size={12} color="#111827" />
        </View>
      </View>
    </TouchableOpacity>
  );
}
