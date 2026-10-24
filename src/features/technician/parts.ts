import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '../../lib/api';
import { useLanguage } from '../../i18n/LanguageContext';
import { useAuth } from '../auth/AuthContext';
import { useAuthedQuery } from '../home/useTenantHome';
import { useRefreshTechnician } from './useTechnician';

export const PARTS_REASON = 'Parts Required';

export type CatalogPart = {
  id: string;
  name: string;
  sku?: string | null;
  unit_of_measure?: string | null;
};

export type PartRequestItem = {
  part_id: string;
  part_name?: string | null;
  sku?: string | null;
  unit?: string | null;
  requested_quantity: number | string;
  approved_quantity?: number | string | null;
  issued_quantity?: number | string | null;
  used_quantity?: number | string | null;
};

export type PartRequest = {
  id: string;
  status: 'requested' | 'approved' | 'issued' | 'rejected' | 'used' | string;
  reason?: string | null;
  rejection_reason?: string | null;
  requested_at?: string | null;
  items: PartRequestItem[];
};

export type PartUsage = {
  id: string;
  part_id: string;
  part_name?: string | null;
  unit?: string | null;
  quantity: number | string;
  created_at?: string | null;
};

export type PartLine = { part_id: string; quantity: number };

export type IssuedBalance = {
  part_id: string;
  name: string;
  sku?: string | null;
  unit?: string | null;
  issued: number;
  used: number;
  available: number;
};

export const num = (value: number | string | null | undefined) => Number(value ?? 0) || 0;

export function formatQty(value: number | string | null | undefined, unit?: string | null) {
  const n = num(value);
  const text = Number.isInteger(n) ? String(n) : String(Number(n.toFixed(3)));
  return unit ? `${text} ${unit}` : text;
}

export function issuedBalances(requests: PartRequest[] = []): IssuedBalance[] {
  const map = new Map<string, IssuedBalance>();
  for (const request of requests) {
    if (request.status !== 'issued') continue;
    for (const item of request.items) {
      const row = map.get(item.part_id) ?? {
        part_id: item.part_id,
        name: item.part_name || item.sku || '—',
        sku: item.sku,
        unit: item.unit,
        issued: 0,
        used: 0,
        available: 0,
      };
      row.issued += num(item.issued_quantity);
      row.used += num(item.used_quantity);
      row.available = Math.max(row.issued - row.used, 0);
      map.set(item.part_id, row);
    }
  }
  return [...map.values()];
}

export const usePartsCatalog = (enabled: boolean) =>
  useAuthedQuery<{ parts: CatalogPart[] }>('tech-parts', '/parts', enabled);

function usePartsMutation<T>(jobId: string, path: string) {
  const { token } = useAuth();
  const { language } = useLanguage();
  const refresh = useRefreshTechnician();
  return useMutation({
    mutationFn: (body: T) =>
      apiRequest(`/work-orders/${jobId}/${path}`, { method: 'POST', body, token, language }),
    onSuccess: () => refresh(jobId),
  });
}

export const useRequestParts = (jobId: string) =>
  usePartsMutation<{ reason: string; items: PartLine[]; hold: boolean }>(jobId, 'part-requests');

export const useRecordUsage = (jobId: string) =>
  usePartsMutation<{ items: PartLine[] }>(jobId, 'parts/usage');
