import React, { useRef } from 'react';
import { View, TextInput, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useKeyboardAvoidance } from '../contexts/KeyboardAvoidanceContext';

interface SearchBarProps {
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
  onSearchPress?: () => void;
  onFilterPress?: () => void;
  onResetPress?: () => void;
  showReset?: boolean;
  editable?: boolean;
  onSubmitEditing?: () => void;
  searchIconColor?: string;
  filterBgColor?: string;
  resetBorderColor?: string;
  resetIconColor?: string;
  borderColor?: string;
}

export function SearchBar({
  placeholder = 'Search here...',
  value,
  onChangeText,
  onSearchPress,
  onFilterPress,
  onResetPress,
  showReset = false,
  editable = false,
  onSubmitEditing,
  searchIconColor = '#9CA3AF',
  filterBgColor = '#8E54E9',
  resetBorderColor = '#E9D5FF',
  resetIconColor = '#8E54E9',
  borderColor,
}: SearchBarProps) {
  const { i18n } = useTranslation();
  const isRTL = (i18n.language || '').startsWith('ar');
  const fontFamily = isRTL ? 'PlaypenSansArabic_400Regular' : 'Inter_400Regular';
  const inputRef = useRef<TextInput>(null);
  const { ensureVisible } = useKeyboardAvoidance();

  const input = (
    <TextInput
      ref={inputRef}
      className="text-sm text-gray-800"
      style={{
        textAlign: isRTL ? 'right' : 'left',
        writingDirection: isRTL ? 'rtl' : 'ltr',
        fontFamily,
      }}
      placeholder={placeholder}
      placeholderTextColor="#9CA3AF"
      value={value}
      onChangeText={onChangeText}
      underlineColorAndroid="transparent"
      editable={editable}
      onSubmitEditing={onSubmitEditing}
      returnKeyType="search"
      onFocus={() => ensureVisible(inputRef.current)}
    />
  );

  const searchIcon = (
    <View style={isRTL ? { marginLeft: 8, marginRight: 12 } : { marginLeft: 12, marginRight: 8 }}>
      <Ionicons name="search-outline" size={20} color={searchIconColor} />
    </View>
  );

  const inputSlot = editable ? (
    <View className="flex-1">{input}</View>
  ) : (
    <TouchableOpacity activeOpacity={1} onPress={onSearchPress} className="flex-1">
      <View pointerEvents="none">{input}</View>
    </TouchableOpacity>
  );

  const filterButton = onFilterPress ? (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onFilterPress}
      className="h-10 w-10 items-center justify-center"
      style={{ borderRadius: 20, backgroundColor: filterBgColor }}
    >
      <Ionicons name="options-outline" size={20} color="#FFFFFF" />
    </TouchableOpacity>
  ) : null;

  const resetButton =
    showReset && onResetPress ? (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onResetPress}
        className="h-10 w-10 items-center justify-center bg-white"
        style={{
          borderRadius: 20,
          borderWidth: 1.5,
          borderColor: resetBorderColor,
          ...(isRTL ? { marginRight: 6 } : { marginLeft: 6 }),
        }}
        accessibilityLabel="Reset filters"
      >
        <Ionicons name="refresh-circle" size={26} color={resetIconColor} />
      </TouchableOpacity>
    ) : null;

  return (
    <View
      className="h-14 items-center bg-white px-2 shadow-sm"
      style={{
        // Keep LTR so I18nManager RTL does not flip our explicit Arabic order.
        direction: 'ltr',
        flexDirection: isRTL ? 'row-reverse' : 'row',
        borderRadius: 28,
        borderWidth: borderColor ? 1.5 : 0,
        borderColor: borderColor || 'transparent',
        shadowColor: borderColor ? '#0D9488' : '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: borderColor ? 0.06 : 0.05,
        shadowRadius: 8,
        elevation: 2,
      }}
    >
      {searchIcon}
      {inputSlot}
      {filterButton}
      {resetButton}
    </View>
  );
}
