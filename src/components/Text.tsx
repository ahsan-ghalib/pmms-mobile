import React from 'react';
import { Text as RNText, TextProps, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

/** Arabic reads a bit larger than English Inter to match vendor feel. */
const ARABIC_SIZE_BUMP = 1;
/** Playpen Sans glyphs are taller; keep line-height ahead of the bumped size. */
const ARABIC_LINE_EXTRA = 4;

function isAppManagedFont(family: string): boolean {
  return family.includes('Inter') || family.includes('Cairo') || family.includes('PlaypenSans');
}

/**
 * App-wide Text — same as vendor:
 * Arabic → Playpen Sans Arabic (slightly bolder + larger)
 * English → Inter
 */
export const Text = (props: TextProps) => {
  const { i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';

  // Arabic defaults to Medium so it reads a touch bolder like vendor tabs/UI
  let fontFamily = isRTL ? 'PlaypenSansArabic_500Medium' : 'Inter_400Regular';

  const flattenedStyle = StyleSheet.flatten(props.style) || {};
  let fontWeight = String(flattenedStyle.fontWeight || '400');
  const classNames = (props as any).className || '';

  if (classNames.includes('font-medium')) fontWeight = '500';
  else if (classNames.includes('font-semibold')) fontWeight = '600';
  else if (classNames.includes('font-bold')) fontWeight = '700';
  else if (classNames.includes('font-extrabold')) fontWeight = '800';
  else if (classNames.includes('font-black')) fontWeight = '900';

  const existingFamily =
    typeof flattenedStyle.fontFamily === 'string' ? flattenedStyle.fontFamily : '';

  if (existingFamily && !isAppManagedFont(existingFamily)) {
    return <RNText {...props} />;
  }

  if (isRTL) {
    // Step Arabic weights up one notch vs English for a bolder look
    if (fontWeight === '400' || fontWeight === 'normal') fontFamily = 'PlaypenSansArabic_500Medium';
    else if (fontWeight === '500') fontFamily = 'PlaypenSansArabic_600SemiBold';
    else if (fontWeight === '600') fontFamily = 'PlaypenSansArabic_700Bold';
    else if (fontWeight === '700' || fontWeight === 'bold')
      fontFamily = 'PlaypenSansArabic_800ExtraBold';
    else if (fontWeight === '800' || fontWeight === '900')
      fontFamily = 'PlaypenSansArabic_800ExtraBold';
  } else {
    if (fontWeight === '500') fontFamily = 'Inter_500Medium';
    else if (fontWeight === '600') fontFamily = 'Inter_600SemiBold';
    else if (fontWeight === '700' || fontWeight === 'bold') fontFamily = 'Inter_700Bold';
    else if (fontWeight === '800') fontFamily = 'Inter_800ExtraBold';
    else if (fontWeight === '900') fontFamily = 'Inter_900Black';
  }

  const {
    fontWeight: _fw,
    fontFamily: _ff,
    ...restStyle
  } = flattenedStyle as Record<string, unknown>;

  const finalStyle: Record<string, unknown> = Object.fromEntries(
    Object.entries(restStyle).filter(([_, v]) => v !== undefined),
  );

  if (isRTL) {
    if (typeof finalStyle.fontSize === 'number') {
      finalStyle.fontSize = (finalStyle.fontSize as number) + ARABIC_SIZE_BUMP;
    }
    if (typeof finalStyle.lineHeight === 'number') {
      const fontSize =
        typeof finalStyle.fontSize === 'number'
          ? finalStyle.fontSize
          : (finalStyle.lineHeight as number);
      const minLineHeight = Math.ceil(Number(fontSize) * 1.45);
      finalStyle.lineHeight = Math.max(
        (finalStyle.lineHeight as number) + ARABIC_SIZE_BUMP + ARABIC_LINE_EXTRA,
        minLineHeight,
      );
    }
    if (finalStyle.textAlign === undefined) {
      finalStyle.textAlign = 'right';
    }
  } else if (finalStyle.textAlign === undefined) {
    finalStyle.textAlign = 'left';
  }

  return <RNText {...props} style={[finalStyle, { fontFamily, fontWeight: 'normal' }]} />;
};
