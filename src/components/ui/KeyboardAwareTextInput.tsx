import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { TextInput, type TextInputProps, StyleSheet } from 'react-native';
import i18n from '../../i18n';
import { useKeyboardAvoidance } from '../../contexts/KeyboardAvoidanceContext';

/**
 * Drop-in TextInput that slides the screen so the focused field stays above the keyboard.
 */
export const KeyboardAwareTextInput = forwardRef<TextInput, TextInputProps>(
  function KeyboardAwareTextInput({ onFocus, style, ...props }, ref) {
    const inputRef = useRef<TextInput>(null);
    const { ensureVisible } = useKeyboardAvoidance();
    const isArabic = i18n.language === 'ar';
    const fontFamily = isArabic ? 'PlaypenSansArabic_500Medium' : 'Inter_500Medium';

    useImperativeHandle(ref, () => inputRef.current as TextInput);

    return (
      <TextInput
        ref={inputRef}
        {...props}
        style={[{ fontFamily }, StyleSheet.flatten(style)]}
        onFocus={(event) => {
          ensureVisible(inputRef.current);
          onFocus?.(event);
        }}
      />
    );
  },
);
