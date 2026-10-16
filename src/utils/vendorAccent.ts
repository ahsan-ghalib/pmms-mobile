export type VendorAccent = {
  primary: string;
  primarySoft: string;
  primaryBorder: string;
  primaryMuted: string;
  primaryDark: string;
};

const DEFAULT_ACCENT: VendorAccent = {
  primary: '#6366F1',
  primarySoft: '#EEF2FF',
  primaryBorder: '#C7D2FE',
  primaryMuted: '#E0E7FF',
  primaryDark: '#4F46E5',
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const cleaned = hex.replace('#', '').trim();
  if (!/^[0-9A-Fa-f]{6}$/.test(cleaned)) return null;

  return {
    r: parseInt(cleaned.slice(0, 2), 16),
    g: parseInt(cleaned.slice(2, 4), 16),
    b: parseInt(cleaned.slice(4, 6), 16),
  };
}

function rgbToHex(r: number, g: number, b: number) {
  return `#${[r, g, b]
    .map((channel) => clamp(Math.round(channel), 0, 255).toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()}`;
}

function mixWithWhite(hex: string, amount: number) {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;

  return rgbToHex(
    rgb.r + (255 - rgb.r) * amount,
    rgb.g + (255 - rgb.g) * amount,
    rgb.b + (255 - rgb.b) * amount,
  );
}

function darken(hex: string, amount: number) {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;

  return rgbToHex(rgb.r * (1 - amount), rgb.g * (1 - amount), rgb.b * (1 - amount));
}

/**
 * Instant accent palette from API brand_color (no image processing on device).
 */
export function buildVendorAccent(brandColor?: string | null): VendorAccent {
  if (!brandColor || !hexToRgb(brandColor)) {
    return DEFAULT_ACCENT;
  }

  const primary = brandColor.startsWith('#')
    ? brandColor.toUpperCase()
    : `#${brandColor.toUpperCase()}`;

  return {
    primary,
    primarySoft: mixWithWhite(primary, 0.9),
    primaryBorder: mixWithWhite(primary, 0.65),
    primaryMuted: mixWithWhite(primary, 0.8),
    primaryDark: darken(primary, 0.12),
  };
}
