import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Pressable } from 'react-native';
import PhoneInputLib from 'react-native-phone-number-input';
import { AsYouType } from 'libphonenumber-js';
import { useTranslation } from 'react-i18next';
import { useKeyboardAvoidance } from '../../contexts/KeyboardAvoidanceContext';
import { toAsciiDigits, NUMERIC_KEYBOARD_PROPS } from '../../utils/numericKeyboard';

interface PhoneInputProps {
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
}

export function PhoneInput({ value, onChangeText, error }: PhoneInputProps) {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';
  const [isFocused, setIsFocused] = useState(false);
  const [formattedValue, setFormattedValue] = useState(value || '');
  const [countryCode, setCountryCode] = useState<any>('SA');
  const phoneInputRef = useRef<PhoneInputLib>(null);
  const containerRef = useRef<View>(null);
  const { ensureVisible } = useKeyboardAvoidance();

  // Sync external value changes (e.g. initial load)
  useEffect(() => {
    if (value && value !== formattedValue && !value.includes(formattedValue)) {
      // Only format if it's not the user actively typing the same thing
      const formatter = new AsYouType(countryCode);
      const formatted = formatter.input(value);
      setFormattedValue(formatted);
    }
  }, [value, countryCode]);

  const handleTextChange = (text: string) => {
    // Only format the raw text without the calling code
    // The library passes just the number part to onChangeText
    const ascii = toAsciiDigits(text);
    const formatter = new AsYouType(countryCode);
    const formatted = formatter.input(ascii);

    setFormattedValue(formatted);
    // Send the full formatted value (with calling code) to parent
    const callingCode = phoneInputRef.current?.getCallingCode() || '966';
    onChangeText(`+${callingCode}${formatted.replace(/\s+/g, '')}`);
  };

  const focusInput = () => {
    const ref = phoneInputRef.current as
      | (PhoneInputLib & {
          focus?: () => void;
          textInputRef?: { current?: { focus?: () => void } };
        })
      | null;
    ref?.focus?.();
    ref?.textInputRef?.current?.focus?.();
    ensureVisible(containerRef.current);
  };

  return (
    <View className="mb-3" ref={containerRef}>
      <Pressable
        onPress={focusInput}
        className={`flex-row items-center rounded-[16px] border bg-white ${isFocused ? 'border-purple-500' : 'border-gray-100'}`}
        style={{ overflow: 'hidden' }}
      >
        <PhoneInputLib
          ref={phoneInputRef}
          value={formattedValue}
          defaultCode="SA"
          layout="second"
          onChangeText={handleTextChange}
          onChangeCountry={(country) => setCountryCode(country.cca2)}
          containerStyle={{
            backgroundColor: 'transparent',
            width: '100%',
            height: 52,
          }}
          textContainerStyle={{
            backgroundColor: 'transparent',
            paddingVertical: 0,
            paddingHorizontal: 12,
            borderLeftWidth: 1,
            borderLeftColor: '#F3F4F6',
          }}
          textInputStyle={{
            fontSize: isArabic ? 15 : 14,
            color: '#111827',
            fontFamily: isArabic ? 'PlaypenSansArabic_500Medium' : 'Inter_500Medium',
            fontWeight: '500',
            paddingVertical: 0,
            height: 52,
            textAlign: 'left',
            writingDirection: 'ltr',
          }}
          codeTextStyle={{
            fontSize: isArabic ? 15 : 14,
            color: '#111827',
            fontFamily: isArabic ? 'PlaypenSansArabic_500Medium' : 'Inter_500Medium',
            fontWeight: '500',
            marginLeft: 0,
          }}
          countryPickerProps={{
            withAlphaFilter: true,
            withFlag: true,
            withEmoji: true,
            withCallingCode: true,
          }}
          textInputProps={{
            onFocus: () => {
              setIsFocused(true);
              ensureVisible(containerRef.current);
            },
            onBlur: () => setIsFocused(false),
            placeholderTextColor: '#9CA3AF',
            placeholder: t('phone_number', 'Phone Number'),
            ...NUMERIC_KEYBOARD_PROPS,
          }}
        />
      </Pressable>
      {error ? <Text className="mt-1 ml-2 text-xs text-red-500">{error}</Text> : null}
    </View>
  );
}
