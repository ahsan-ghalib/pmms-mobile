import { ProductAttribute, ProductListItem, ProductVariant } from '../api/services/product.service';

/** Common color names → hex (matches vendor web form defaults). */
const NAMED_COLORS: Record<string, string> = {
  red: '#FF0000',
  blue: '#0000FF',
  green: '#008000',
  yellow: '#FFFF00',
  black: '#000000',
  white: '#FFFFFF',
  purple: '#800080',
  orange: '#FFA500',
  pink: '#FFC0CB',
  gray: '#808080',
  grey: '#808080',
  brown: '#A52A2A',
  cyan: '#00FFFF',
  magenta: '#FF00FF',
  navy: '#000080',
  maroon: '#800000',
  teal: '#008080',
  olive: '#808000',
  lime: '#00FF00',
  aqua: '#00FFFF',
  silver: '#C0C0C0',
  gold: '#FFD700',
  beige: '#F5F5DC',
  cream: '#FFFDD0',
  ivory: '#FFFFF0',
  coral: '#FF7F50',
  indigo: '#4B0082',
  violet: '#EE82EE',
  khaki: '#F0E68C',
  turquoise: '#40E0D0',
};

function normalizeHex(code: string): string | null {
  const cleaned = code.trim().replace(/^#/, '');
  if (!/^[0-9A-Fa-f]{3}$|^[0-9A-Fa-f]{6}$/.test(cleaned)) {
    return null;
  }
  if (cleaned.length === 3) {
    return `#${cleaned
      .split('')
      .map((c) => c + c)
      .join('')}`;
  }
  return `#${cleaned.toUpperCase()}`;
}

function isColorAttribute(attribute: ProductAttribute): boolean {
  const key = String(attribute.key || '').toLowerCase();
  const type = String(attribute.type || '').toLowerCase();
  const name = String(attribute.name || '').toLowerCase();
  const nameAr = String(attribute.name_ar || '');

  return (
    key === 'color' ||
    key.includes('color') ||
    type === 'color' ||
    name.includes('color') ||
    name.includes('colour') ||
    nameAr.includes('لون')
  );
}

function isColorOptionKey(key: string): boolean {
  const k = key.toLowerCase();
  return k === 'color' || k.includes('color') || k.includes('colour') || k.includes('لون');
}

function resolveColorToken(raw: string): string | null {
  const text = String(raw || '').trim();
  if (!text) return null;

  // "Green (#008000)" or bare "#008000"
  const hexInText = text.match(/#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})\b/);
  if (hexInText) {
    return normalizeHex(hexInText[0]);
  }

  const named = NAMED_COLORS[text.toLowerCase()];
  if (named) return named;

  return null;
}

/**
 * Unique hex color swatches for product cards.
 * Sources (in order): attribute color_code → variant option color names/hex.
 */
export function getProductColorSwatches(product?: ProductListItem | null): string[] {
  if (!product) return [];

  const seen = new Set<string>();
  const colors: string[] = [];

  const pushColor = (raw?: string | null) => {
    if (!raw) return;
    const hex = normalizeHex(String(raw)) || resolveColorToken(String(raw));
    if (!hex) return;
    const key = hex.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    colors.push(hex);
  };

  // 1) Attribute values with color_code (detail / updated search APIs)
  for (const attribute of product.attributes || []) {
    if (!isColorAttribute(attribute)) continue;
    for (const value of attribute.values || []) {
      pushColor(value.color_code);
      if (!value.color_code) {
        pushColor(value.value);
      }
    }
  }

  if (colors.length === 0) {
    for (const attribute of product.attributes || []) {
      for (const value of attribute.values || []) {
        pushColor(value.color_code);
      }
    }
  }

  // 2) Variant options — list API currently returns options like { color: "Green" }
  if (colors.length === 0) {
    const variants: Array<ProductVariant | NonNullable<ProductListItem['default_variant']>> = [
      ...(product.variants || []),
      ...(product.default_variant ? [product.default_variant] : []),
    ];

    for (const variant of variants) {
      const options = (variant as any)?.options;
      if (!options || typeof options !== 'object' || Array.isArray(options)) continue;

      for (const [key, value] of Object.entries(options)) {
        if (!isColorOptionKey(String(key))) continue;
        pushColor(String(value ?? ''));
      }
    }
  }

  return colors;
}
