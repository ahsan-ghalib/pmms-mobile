export function toAsciiDigits(value: string): string {
  return value
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 1632))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 1776));
}

export function digitsOnly(value: string): string {
  return toAsciiDigits(value).replace(/\D/g, '');
}

export const NUMERIC_KEYBOARD_PROPS = {
  keyboardType: 'number-pad' as const,
  autoCorrect: false,
  autoCapitalize: 'none' as const,
};
