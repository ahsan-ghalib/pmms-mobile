import type { ProductListItem, ProductVariant } from '../api/services/product.service';

export function variantUnitPrice(
  variant?: { price?: number | string | null; sale_price?: number | string | null } | null,
): number {
  const price = Number(variant?.price);
  return Number.isFinite(price) ? price : Number.POSITIVE_INFINITY;
}

export function sameVariantId(
  left?: number | string | null,
  right?: number | string | null,
): boolean {
  return left != null && right != null && String(left) === String(right);
}

export function extractVariantAttributes(
  variant?: ProductVariant | ProductListItem['default_variant'] | null,
): Record<string, string> {
  const next: Record<string, string> = {};
  const attrs = (variant as ProductVariant | undefined)?.attributes;
  if (Array.isArray(attrs)) {
    attrs.forEach((attr) => {
      const key = attr.attribute_key;
      const value = attr.attribute_value;
      if (key && value) {
        next[String(key)] = String(value);
      }
    });
  }

  const options = variant?.options;
  if (options && typeof options === 'object' && !Array.isArray(options)) {
    Object.entries(options).forEach(([key, value]) => {
      if (key && value != null && String(value).length > 0) {
        next[key] = String(value);
      }
    });
  }

  return next;
}

/** Cheapest `price` variant — same rule as product create on the backend. */
export function resolveDefaultVariant(
  product?: ProductListItem | null,
): ProductVariant | NonNullable<ProductListItem['default_variant']> | null {
  const variants = Array.isArray(product?.variants) ? product.variants : [];
  if (variants.length > 0) {
    return [...variants].sort((a, b) => variantUnitPrice(a) - variantUnitPrice(b))[0] ?? null;
  }
  return product?.default_variant ?? null;
}

export function resolveDefaultVariantPrice(product?: ProductListItem | null): number {
  const variant = resolveDefaultVariant(product);
  const price = Number(variant?.price ?? product?.price ?? 0);
  return Number.isFinite(price) ? price : 0;
}

export function normalizeProductForCart(product?: ProductListItem | null): ProductListItem | null {
  if (!product) {
    return null;
  }
  const raw = product as ProductListItem & {
    modifierGroups?: ProductListItem['modifier_groups'];
    product_attributes?: ProductListItem['attributes'];
    product_variants?: ProductListItem['variants'];
  };
  return {
    ...product,
    variants: raw.variants ?? raw.product_variants ?? [],
    attributes: raw.attributes ?? raw.product_attributes ?? [],
    modifier_groups: raw.modifier_groups ?? raw.modifierGroups ?? [],
  };
}

export function productHasFullVariantData(product?: ProductListItem | null): boolean {
  const normalized = normalizeProductForCart(product);
  if (!normalized) {
    return false;
  }
  const variants = normalized.variants ?? [];
  const attributes = normalized.attributes ?? [];
  const modifiers = normalized.modifier_groups ?? [];
  const hasAttributeChoices = attributes.some((attr) => (attr.values?.length ?? 0) > 0);
  const hasModifierItems = modifiers.some((group) => (group.items?.length ?? 0) > 0);
  return variants.length > 1 || hasAttributeChoices || hasModifierItems;
}

export function productNeedsVariantSelection(product?: ProductListItem | null): boolean {
  const normalized = normalizeProductForCart(product);
  if (!normalized) {
    return false;
  }
  const variants = normalized.variants ?? [];
  const attributes = normalized.attributes ?? [];
  const modifiers = normalized.modifier_groups ?? [];
  if (variants.length > 1) {
    return true;
  }
  if (modifiers.some((group) => (group.items?.length ?? 0) > 0)) {
    return true;
  }
  if (attributes.some((attr) => (attr.values?.length ?? 0) > 0)) {
    return true;
  }
  return false;
}
