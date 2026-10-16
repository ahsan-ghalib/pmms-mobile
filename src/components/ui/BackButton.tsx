import React from 'react';
import {
  TouchableOpacity,
  TouchableOpacityProps,
  I18nManager,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';

interface BackButtonProps extends Omit<TouchableOpacityProps, 'style'> {
  size?: number;
  color?: string;
  iconStyle?: any;
  style?: StyleProp<ViewStyle>;
  /** If true, calls router.back() when pressed and no custom onPress is provided */
  autoBack?: boolean;
}

const checkIsArabic = (language: string | undefined) => {
  if (language) return language.startsWith('ar');
  return I18nManager.isRTL;
};

/**
 * Back sits on the right in Arabic headers, so the glyph must point right (`>`).
 * Do not invert for I18nManager.isRTL — Ionicons are not reliably mirrored here,
 * and compensating made Arabic show `<` incorrectly.
 */
function backChevronName(isArabic: boolean): keyof typeof Ionicons.glyphMap {
  return isArabic ? 'chevron-forward' : 'chevron-back';
}

function forwardChevronName(isArabic: boolean): keyof typeof Ionicons.glyphMap {
  return isArabic ? 'chevron-back' : 'chevron-forward';
}

export function BackButton({
  size = 24,
  color = '#8E54E9',
  iconStyle,
  style,
  onPress,
  autoBack = true,
  ...rest
}: BackButtonProps) {
  const { i18n } = useTranslation();
  const router = useRouter();

  const isArabic = checkIsArabic(i18n.language);

  const handlePress = (e: any) => {
    if (onPress) {
      onPress(e);
    } else if (autoBack && router.canGoBack()) {
      router.back();
    }
  };

  return (
    <TouchableOpacity onPress={handlePress} style={style} {...rest}>
      <Ionicons name={backChevronName(isArabic)} size={size} color={color} style={iconStyle} />
    </TouchableOpacity>
  );
}

/** Just the Icon, useful when wrapping inside a Pressable or custom container */
export function BackIcon({
  size = 24,
  color = '#8E54E9',
  style,
}: {
  size?: number;
  color?: string;
  style?: any;
}) {
  const { i18n } = useTranslation();
  const isArabic = checkIsArabic(i18n.language);

  return <Ionicons name={backChevronName(isArabic)} size={size} color={color} style={style} />;
}

/** Forward Icon ('>'), auto-flips to '<' in Arabic */
export function ForwardIcon({
  size = 16,
  color = '#9CA3AF',
  style,
}: {
  size?: number;
  color?: string;
  style?: any;
}) {
  const { i18n } = useTranslation();
  const isArabic = checkIsArabic(i18n.language);

  return <Ionicons name={forwardChevronName(isArabic)} size={size} color={color} style={style} />;
}
