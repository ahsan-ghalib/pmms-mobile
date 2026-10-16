export function isTruthyFlag(value: unknown): boolean {
  return value === true || value === 1 || value === '1' || value === 'true';
}

export function isRestaurantOrFoodVendor(vendor?: any): boolean {
  if (!vendor) {
    return false;
  }

  if (isTruthyFlag(vendor.is_food_vendor)) {
    return true;
  }

  const activity = vendor.activity_type || vendor.activityType;
  if (!activity) {
    return false;
  }

  const type = String(activity.type || activity.category_type || '').toLowerCase();
  if (type === 'food') {
    return true;
  }

  const name = `${activity.name || ''} ${activity.name_ar || ''}`.toLowerCase();
  return (
    name.includes('restaurant') ||
    name.includes('cafe') ||
    name.includes('مطعم') ||
    name.includes('مقاه')
  );
}

export function getVendorMenuPath(
  vendor?: any,
): '/shop/RestaurantMenuScreen' | '/shop/ShopProductsScreen' {
  return isRestaurantOrFoodVendor(vendor)
    ? '/shop/RestaurantMenuScreen'
    : '/shop/ShopProductsScreen';
}

export function getVendorDisplayName(vendor?: any, fallback?: string): string {
  return vendor?.name || vendor?.store_name || fallback || '';
}

/**
 * Menu / activity-type icon for feed side actions (iOS `activityTypeLogo` parity).
 * Prefers image, then icon/logo across post + vendor shapes.
 */
export function getActivityTypeIconUri(postOrVendor?: any): string | null {
  if (!postOrVendor) {
    return null;
  }

  const activity =
    postOrVendor.activity_type ||
    postOrVendor.activityType ||
    postOrVendor.vendor?.activity_type ||
    postOrVendor.vendor?.activityType ||
    null;

  const candidates = [
    postOrVendor.activityTypeLogo,
    postOrVendor.activity_type_logo,
    postOrVendor.activity_type_image,
    activity?.image,
    activity?.icon,
    activity?.logo,
  ];

  for (const value of candidates) {
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }

  return null;
}
