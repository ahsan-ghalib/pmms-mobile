import { useAuthedQuery } from '../home/useTenantHome';

export type Service = { id: string; name_en: string; name_ar?: string | null; status?: string };

export type Category = {
  id: string;
  name_en: string;
  name_ar?: string | null;
  description?: string | null;
  normal_priority_enabled: boolean;
  urgent_priority_enabled: boolean;
  services?: Service[];
};

export type Slot = {
  date: string;
  start_time: string;
  end_time: string;
  available: boolean;
  booked_count: number;
  capacity: number | null;
};

export const useCategories = () => useAuthedQuery<Category[]>('create-categories', '/categories');

export const useSlots = (categoryId: string | null) =>
  useAuthedQuery<Slot[]>(
    `create-slots-${categoryId}`,
    `/complaints/slots?category_id=${categoryId}`,
    Boolean(categoryId),
  );
