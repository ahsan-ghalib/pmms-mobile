import { Text } from '../Text';

import React from 'react';
import { TouchableOpacity, TouchableOpacityProps, ActivityIndicator, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

export interface ButtonProps extends TouchableOpacityProps {
  title: string;
  isLoading?: boolean;
  icon?: keyof typeof import('@expo/vector-icons').Ionicons.glyphMap;
}

export function Button({ title, isLoading, className = '', ...props }: ButtonProps) {
  const { i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      className={`h-14 w-full flex-row items-center justify-center rounded-2xl bg-[#8E54E9] ${className}`}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading ? (
        <ActivityIndicator color="#FFFFFF" />
      ) : (
        <View className="flex-row items-center">
          {props.icon && (
            <Ionicons
              name={props.icon}
              size={20}
              color="#FFFFFF"
              style={isArabic ? { marginLeft: 8 } : { marginRight: 8 }}
            />
          )}
          <Text className="text-base font-semibold text-white">{title}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}
