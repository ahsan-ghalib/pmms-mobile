import { Text } from '../Text';

import React, { useRef, useState } from 'react';
import { View, TextInput, TextInputProps, TouchableOpacity, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import i18n from '../../i18n';
import { useKeyboardAvoidance } from '../../contexts/KeyboardAvoidanceContext';

export interface CustomInputProps extends TextInputProps {
  icon?: string | React.ReactNode;
  label?: string;
  value?: string;
  placeholder?: string;
  rightIcon?: string;
  isReadOnly?: boolean;
  isPassword?: boolean;
  error?: string;
}

const getIconColor = (iconName: string) => {
  const baseName = iconName.replace('-outline', '');
  switch (baseName) {
    case 'mail':
      return '#218DAE'; // Teal/Blue
    case 'lock-closed':
      return '#1DD1A1';
    case 'person':
      return '#2E86DE';
    case 'gift':
      return '#FF9F43';
    case 'business':
      return '#9B59B6';
    default:
      return '#8E54E9';
  }
};

export function CustomInput({
  icon,
  label,
  value,
  placeholder,
  rightIcon,
  isReadOnly,
  isPassword,
  error,
  onFocus,
  onBlur,
  secureTextEntry,
  ...textInputProps
}: CustomInputProps) {
  const isArabic = i18n.language === 'ar';
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const { ensureVisible } = useKeyboardAvoidance();
  // Treat secureTextEntry as password so eye toggle works even when isPassword is omitted
  const passwordField = Boolean(isPassword || secureTextEntry);

  const focusInput = () => {
    if (isReadOnly) {
      return;
    }
    inputRef.current?.focus();
  };

  return (
    <View className="mb-3">
      <Pressable
        onPress={focusInput}
        accessibilityRole="none"
        className="flex-row items-center rounded-[16px] border px-4 py-3"
        style={{
          borderColor: isFocused
            ? typeof icon === 'string'
              ? getIconColor(icon)
              : '#8E54E9'
            : '#F3F4F6',
          backgroundColor: isFocused
            ? typeof icon === 'string'
              ? `${getIconColor(icon)}12`
              : '#8E54E912'
            : '#FFFFFF',
        }}
      >
        {typeof icon === 'string' ? (
          <Ionicons
            name={icon.replace('-outline', '') as any}
            size={24}
            color={getIconColor(icon)}
            // taps on icon should also focus the field
          />
        ) : icon ? (
          icon
        ) : null}
        <View
          className={`flex-1 justify-center items-start ${i18n.language === 'ar' ? 'mr-3' : 'ml-3'}`}
          pointerEvents="box-none"
        >
          {label ? (
            <Text className="text-[12px] text-gray-500 mb-0.5" pointerEvents="none">
              {label}
            </Text>
          ) : null}
          {isReadOnly ? (
            value ? (
              <Text
                className="text-[16px] text-gray-900 font-medium"
                style={{ textAlign: i18n.language === 'ar' ? 'right' : 'left' }}
              >
                {value}
              </Text>
            ) : (
              <Text className="text-[16px] text-gray-400">{placeholder}</Text>
            )
          ) : (
            <TextInput
              ref={inputRef}
              value={value}
              placeholder={placeholder}
              placeholderTextColor="#9CA3AF"
              className="text-gray-900 font-medium p-0 m-0 w-full"
              style={{
                textAlign: i18n.language === 'ar' ? 'right' : 'left',
                fontSize: 16,
                minHeight: 22,
                width: '100%',
                fontFamily: isArabic ? 'PlaypenSansArabic_500Medium' : 'Inter_500Medium',
              }}
              secureTextEntry={passwordField && !showPassword}
              {...textInputProps}
              onFocus={(event) => {
                setIsFocused(true);
                ensureVisible(inputRef.current);
                onFocus?.(event);
              }}
              onBlur={(event) => {
                setIsFocused(false);
                onBlur?.(event);
              }}
            />
          )}
        </View>
        {passwordField && !isReadOnly ? (
          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
            className="ml-2 p-1"
            hitSlop={8}
          >
            <Ionicons name={showPassword ? 'eye' : 'eye-off'} size={24} color="#6B7280" />
          </TouchableOpacity>
        ) : rightIcon ? (
          <Ionicons name={rightIcon.replace('-outline', '') as any} size={24} color="#6B7280" />
        ) : null}
      </Pressable>
      {error ? <Text className="mt-1 ml-2 text-xs text-red-500">{error}</Text> : null}
    </View>
  );
}
