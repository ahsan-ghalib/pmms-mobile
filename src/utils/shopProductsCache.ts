import type { ProductCategory, ProductListItem } from '../api/services/product.service';

export type ShopProductsSnapshot = {
  categories: ProductCategory[];
  products: ProductListItem[];
  totalProducts: number;
  vendorCover: string | null;
  vendorBrandColor: string | null;
  fetchedAt: number;
};

const CACHE_TTL_MS = 10 * 60 * 1000;
const shopCache = new Map<string, ShopProductsSnapshot>();

export function shopProductsCacheKey(vendorId: string, payload: Record<string, unknown>): string {
  // Stable key — ignore undefined noise so soft refreshes hit the same entry.
  const stablePayload = Object.keys(payload)
    .sort()
    .reduce<Record<string, unknown>>((acc, key) => {
      const value = payload[key];
      if (value !== undefined && value !== null && value !== '') {
        acc[key] = value;
      }
      return acc;
    }, {});
  return `${vendorId}:${JSON.stringify(stablePayload)}`;
}

export function getShopProductsCache(key: string): ShopProductsSnapshot | null {
  const entry = shopCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.fetchedAt > CACHE_TTL_MS) {
    shopCache.delete(key);
    return null;
  }
  return entry;
}

export function setShopProductsCache(
  key: string,
  snapshot: Omit<ShopProductsSnapshot, 'fetchedAt'>,
): void {
  shopCache.set(key, { ...snapshot, fetchedAt: Date.now() });
}
