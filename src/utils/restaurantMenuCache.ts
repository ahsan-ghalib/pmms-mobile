import type {
  ProductCategory,
  ProductListItem,
  TopSellingProduct,
} from '../api/services/product.service';
import type { VendorBanner } from '../api/services/vendor.service';

export type RestaurantMenuSnapshot = {
  banners: VendorBanner[];
  categories: ProductCategory[];
  products: ProductListItem[];
  topSelling: TopSellingProduct[];
  fetchedAt: number;
};

const CACHE_TTL_MS = 10 * 60 * 1000;
const menuCache = new Map<string, RestaurantMenuSnapshot>();

export function restaurantMenuCacheKey(vendorId: string, payload: Record<string, unknown>): string {
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

export function getRestaurantMenuCache(key: string): RestaurantMenuSnapshot | null {
  const entry = menuCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.fetchedAt > CACHE_TTL_MS) {
    menuCache.delete(key);
    return null;
  }
  return entry;
}

export function setRestaurantMenuCache(
  key: string,
  snapshot: Omit<RestaurantMenuSnapshot, 'fetchedAt'>,
): void {
  menuCache.set(key, { ...snapshot, fetchedAt: Date.now() });
}

export function peekRestaurantMenuCache(key: string): RestaurantMenuSnapshot | null {
  return menuCache.get(key) ?? null;
}
