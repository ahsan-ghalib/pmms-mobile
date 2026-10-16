import { Text } from './Text';

import { useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, TextInput, TextInputProps, View } from 'react-native';
import i18n from '../i18n';
import { useKeyboardAvoidance } from '../contexts/KeyboardAvoidanceContext';
import { digitsOnly, NUMERIC_KEYBOARD_PROPS } from '../utils/numericKeyboard';

type InputFieldProps = TextInputProps & {
  showPasswordToggle?: boolean;
  secureVisible?: boolean;
  onTogglePassword?: () => void;
};

export function InputField({
  showPasswordToggle,
  secureVisible,
  onTogglePassword,
  className = '',
  style,
  onFocus,
  ...props
}: InputFieldProps) {
  const inputRef = useRef<TextInput>(null);
  const { ensureVisible } = useKeyboardAvoidance();
  const isArabic = i18n.language === 'ar';
  const fontFamily = isArabic ? 'PlaypenSansArabic_500Medium' : 'Inter_500Medium';

  return (
    <View className={`relative ${className}`}>
      <TextInput
        ref={inputRef}
        placeholderTextColor="#AAAAAA"
        className="rounded-2xl border border-[#E0E0E0] bg-[#F5F5F5] px-4 pr-12 text-[13px] tracking-widest text-gray-800"
        style={[{ minHeight: 68, paddingVertical: 20, fontFamily }, style]}
        {...props}
        onFocus={(event) => {
          ensureVisible(inputRef.current);
          onFocus?.(event);
        }}
      />
      {showPasswordToggle && (
        <Pressable
          onPress={onTogglePassword}
          className="absolute bottom-0 right-0 top-0 w-12 items-center justify-center"
          hitSlop={8}
        >
          <Ionicons
            name={secureVisible ? 'eye-outline' : 'eye-off-outline'}
            size={20}
            color="#AAAAAA"
          />
        </Pressable>
      )}
    </View>
  );
}

type PhoneInputProps = {
  value?: string;
  onChangeText?: (text: string) => void;
};

export function PhoneInput({ value, onChangeText }: PhoneInputProps) {
  const inputRef = useRef<TextInput>(null);
  const { ensureVisible } = useKeyboardAvoidance();
  const isArabic = i18n.language === 'ar';
  const fontFamily = isArabic ? 'PlaypenSansArabic_500Medium' : 'Inter_500Medium';

  return (
    <Pressable
      onPress={() => inputRef.current?.focus()}
      className="flex-row overflow-hidden rounded-2xl border border-[#E0E0E0] bg-[#F5F5F5]"
    >
      <View className="justify-center border-r border-[#E0E0E0] px-4 py-4" pointerEvents="none">
        <Text className="text-sm font-medium text-gray-700">+966</Text>
      </View>
      <TextInput
        ref={inputRef}
        placeholder="MOBILE NUMBER"
        placeholderTextColor="#AAAAAA"
        value={value}
        onChangeText={(text) => onChangeText?.(digitsOnly(text))}
        {...NUMERIC_KEYBOARD_PROPS}
        className="flex-1 px-4 py-4 text-[13px] tracking-widest text-gray-800"
        style={{ fontFamily, writingDirection: 'ltr' }}
        onFocus={() => ensureVisible(inputRef.current)}
      />
    </Pressable>
  );
}
