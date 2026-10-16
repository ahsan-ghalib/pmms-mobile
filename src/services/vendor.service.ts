import apiClient from '../apiClient';
import { ENDPOINTS } from '../endpoints';
import { ProductCategory } from './product.service';

export type VendorBrand = {
  id?: number | string;
  name?: string;
  name_ar?: string;
  image?: string | null;
};

export type VendorFilters = {
  categories?: ProductCategory[];
  brands?: VendorBrand[];
  tags?: string[];
  variants?: string[];
  max_price?: number;
};

export type VendorBanner = {
  id?: number | string;
  name?: string;
  name_ar?: string;
  description?: string | null;
  description_ar?: string | null;
  image?: string | null;
  image_url?: string | null;
  sequence?: number;
  is_active?: boolean;
};

export const VendorService = {
  details(id: string | number) {
    return apiClient.get<{ data?: any; message?: string }>(ENDPOINTS.VENDORS.DETAILS(id));
  },

  banners(id: string | number) {
    return apiClient.get<{ data?: VendorBanner[]; success?: boolean; message?: string }>(
      ENDPOINTS.VENDORS.BANNERS(id),
    );
  },

  categories(vendorId?: string | number) {
    return apiClient.get<{ data?: ProductCategory[]; success?: boolean }>(
      ENDPOINTS.DISCOVER.CATEGORIES,
      vendorId ? { vendor_id: vendorId } : undefined,
    );
  },

  filters(vendorId?: string | number) {
    return apiClient.get<{ success?: boolean; data?: VendorFilters }>(
      ENDPOINTS.DISCOVER.VENDOR_FILTERS,
      vendorId ? { vendor_id: vendorId } : undefined,
    );
  },
};

export function unwrapVendor(response: any) {
  return response?.data?.data ?? response?.data ?? response;
}
