import apiClient from '../apiClient';
import { ENDPOINTS } from '../endpoints';

export type ProductSearchPayload = {
  name?: string;
  search?: string;
  status?: 'active' | 'inactive';
  category_id?: number;
  pageSize?: number;
  brand_id?: number;
  vendor_id?: number;
  is_visible?: boolean;
  price_min?: number;
  price_max?: number;
  tags?: string;
  variants?: string[];
  sort_by?: string;
};

export type ProductCategory = {
  id?: number | string;
  name?: string;
  name_ar?: string;
  image?: string | null;
  icon?: string | null;
};

export type ProductListItem = {
  id?: number | string;
  store_id?: number;
  vendor_id?: number;
  name?: string;
  name_ar?: string;
  name_arabic?: string;
  desc_short?: string | null;
  desc_short_arabic?: string | null;
  desc_full?: string | null;
  desc_full_arabic?: string | null;
  featured_image?: string | null;
  images?: Array<{ image?: string; url?: string; path?: string } | string>;
  variants?: ProductVariant[];
  attributes?: ProductAttribute[];
  modifier_groups?: ModifierGroup[];
  default_variant?: {
    id?: number | string;
    price?: number | string | null;
    sale_price?: number | string | null;
    options?: Record<string, string | null> | null;
  } | null;
  price?: number | string | null;
  sale_price?: number | string | null;
  rating?: number | string | null;
  is_addon?: boolean | number;
  is_visible?: boolean | number;
  all_categories?: ProductCategory[];
  allCategories?: ProductCategory[];
  categories?: ProductCategory[];
};

export type TopSellingProduct = {
  id?: number | string;
  product_name?: string;
  name?: string;
  name_ar?: string;
  product_featured_image?: string | null;
  featured_image?: string | null;
  price?: number | string | null;
  sale_price?: number | string | null;
  total_sold?: number | string | null;
  store_id?: number;
  rating?: number | string | null;
};

export type ProductVariant = {
  id?: number | string;
  price?: number | string | null;
  sale_price?: number | string | null;
  stock?: number | string | null;
  sku?: string | null;
  images?: string[] | null;
  options?: Record<string, string | null> | null;
  attributes?: Array<{
    attribute_key?: string | null;
    attribute_value?: string | null;
  }>;
};

export type ProductAttribute = {
  id?: number | string;
  key?: string | null;
  name?: string | null;
  name_ar?: string | null;
  type?: string | null;
  values?: Array<{
    id?: number | string;
    value?: string | null;
    value_ar?: string | null;
    color_code?: string | null;
  }>;
};

export type ModifierItem = {
  id: number;
  name?: string;
  name_ar?: string;
  extra_price?: number;
  sort_order?: number;
  is_incrementable?: boolean;
};

export type ModifierGroup = {
  id: number;
  title?: string;
  title_ar?: string;
  sort_order?: number;
  is_incrementable?: boolean;
  items?: ModifierItem[];
};

export type ProductSearchResponse = {
  data?: {
    products?: ProductListItem[];
    total?: number;
  };
  message?: string;
};

export type ProductDetailResponse = {
  data?: {
    product?: ProductListItem;
    relatedProducts?: ProductListItem[];
  };
  message?: string;
};

export const ProductService = {
  search(payload: ProductSearchPayload) {
    return apiClient.post<ProductSearchResponse>(ENDPOINTS.PRODUCTS.LIST, payload);
  },

  detail(id: string | number) {
    return apiClient.get<ProductDetailResponse>(ENDPOINTS.PRODUCTS.DETAIL(String(id)));
  },

  topSelling(storeId?: number) {
    return apiClient.get<{ data?: TopSellingProduct[]; message?: string }>(
      ENDPOINTS.PRODUCTS.TOP_SELLING,
      storeId ? { store_id: storeId } : undefined,
    );
  },
};
