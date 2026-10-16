const FILTER_PARAM_KEYS = [
  'search',
  'category',
  'category_id',
  'min_price',
  'max_price',
  'tags',
  'brands',
  'brand_id',
  'rating',
  'variants',
  'sort_by',
] as const;

type FilterParams = Record<string, string | string[] | undefined>;

function firstValue(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

export function hasAppliedProductFilters(params: FilterParams) {
  return FILTER_PARAM_KEYS.some((key) => {
    const value = firstValue(params[key]);
    if (!value) return false;
    if (key === 'category' || key === 'category_id') {
      return value !== 'all';
    }
    return true;
  });
}

export function keptShopParams(params: FilterParams) {
  return {
    ...(firstValue(params.vendor_id) ? { vendor_id: firstValue(params.vendor_id) } : {}),
    ...(firstValue(params.shopName) ? { shopName: firstValue(params.shopName) } : {}),
    ...(firstValue(params.skip_food_redirect)
      ? { skip_food_redirect: firstValue(params.skip_food_redirect) }
      : {}),
  };
}
