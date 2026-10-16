import AsyncStorage from '@react-native-async-storage/async-storage';

const FAVORITE_VENDORS_KEY = 'favorite_vendors_v1';

export type FavoriteVendor = {
  id: string;
  name?: string;
  logo?: string | null;
  activityTypeName?: string | null;
  savedAt: string;
};

async function readFavorites(): Promise<FavoriteVendor[]> {
  try {
    const raw = await AsyncStorage.getItem(FAVORITE_VENDORS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeFavorites(items: FavoriteVendor[]): Promise<void> {
  await AsyncStorage.setItem(FAVORITE_VENDORS_KEY, JSON.stringify(items));
}

export async function getFavoriteVendors(): Promise<FavoriteVendor[]> {
  return readFavorites();
}

export async function isFavoriteVendor(vendorId: string | number): Promise<boolean> {
  const id = String(vendorId);
  const favorites = await readFavorites();
  return favorites.some((item) => item.id === id);
}

export async function toggleFavoriteVendor(
  vendor: Omit<FavoriteVendor, 'savedAt'> & { savedAt?: string },
): Promise<boolean> {
  const id = String(vendor.id);
  const favorites = await readFavorites();
  const existingIndex = favorites.findIndex((item) => item.id === id);

  if (existingIndex >= 0) {
    favorites.splice(existingIndex, 1);
    await writeFavorites(favorites);
    return false;
  }

  favorites.unshift({
    id,
    name: vendor.name,
    logo: vendor.logo ?? null,
    activityTypeName: vendor.activityTypeName ?? null,
    savedAt: vendor.savedAt || new Date().toISOString(),
  });
  await writeFavorites(favorites);
  return true;
}
