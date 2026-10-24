import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest, apiUpload } from '../../lib/api';
import { useLanguage } from '../../i18n/LanguageContext';
import { resolveDeviceCoordinates } from '../../utils/resolveDeviceCoordinates';
import { useAuth } from '../auth/AuthContext';
import { useAuthedQuery } from '../home/useTenantHome';
import { Job } from './jobs';

export type DutyStatus = {
  on_duty: boolean;
  privacy_notice_accepted: boolean;
  privacy_notice: string;
  tracking_interval_seconds: number;
  session: { id: string; started_at: string; current_work_order_id?: string | null } | null;
};

export type Coordinates = { latitude: number; longitude: number; accuracy_meters?: number };

export const useTechnicianJobs = () => useAuthedQuery<Job[]>('tech-jobs', '/technician/jobs');
export const useDuty = () => useAuthedQuery<DutyStatus>('tech-duty', '/technician/duty');
export const useJob = (id: string) => useAuthedQuery<Job>(`tech-job-${id}`, `/work-orders/${id}`);

export async function currentCoordinates(): Promise<Coordinates | null> {
  const position = await resolveDeviceCoordinates({ allowDevFallback: false });
  if (!position) return null;
  return {
    latitude: position.latitude,
    longitude: position.longitude,
    ...(position.accuracy != null ? { accuracy_meters: position.accuracy } : {}),
  };
}

export function useRefreshTechnician() {
  const queryClient = useQueryClient();
  return (jobId?: string) => {
    queryClient.invalidateQueries({ queryKey: ['tech-jobs'] });
    queryClient.invalidateQueries({ queryKey: ['tech-duty'] });
    if (jobId) queryClient.invalidateQueries({ queryKey: [`tech-job-${jobId}`] });
  };
}

export function useJobAction(jobId: string) {
  const { token } = useAuth();
  const { language } = useLanguage();
  const refresh = useRefreshTechnician();
  return useMutation({
    mutationFn: ({ action, body }: { action: string; body?: Record<string, unknown> }) =>
      apiRequest(`/work-orders/${jobId}/${action}`, {
        method: 'POST',
        body: body ?? {},
        token,
        language,
      }),
    onSuccess: () => refresh(jobId),
  });
}

export function useCompleteJob(jobId: string) {
  const { token } = useAuth();
  const { language } = useLanguage();
  const refresh = useRefreshTechnician();
  return useMutation({
    mutationFn: (form: FormData) =>
      apiUpload(`/work-orders/${jobId}/complete`, form, { token, language }),
    onSuccess: () => refresh(jobId),
  });
}

export function useDutyToggle() {
  const { token } = useAuth();
  const { language } = useLanguage();
  const refresh = useRefreshTechnician();
  return useMutation({
    mutationFn: async (next: { on: boolean; privacyAccepted?: boolean }) => {
      if (!next.on) {
        return apiRequest('/technician/duty/off', { method: 'POST', token, language });
      }
      const coords = await currentCoordinates();
      return apiRequest('/technician/duty/on', {
        method: 'POST',
        body: { privacy_accepted: Boolean(next.privacyAccepted), ...(coords ?? {}) },
        token,
        language,
      });
    },
    onSuccess: () => refresh(),
  });
}

export function useLocationPings(duty: DutyStatus | undefined) {
  const { token } = useAuth();
  const { language } = useLanguage();
  const onDuty = Boolean(duty?.on_duty);
  const intervalSeconds = Math.max(duty?.tracking_interval_seconds ?? 45, 15);
  const workOrderId = duty?.session?.current_work_order_id ?? null;

  useEffect(() => {
    if (!onDuty || !token) return;
    let active = AppState.currentState === 'active';

    const ping = async () => {
      if (!active) return;
      const coords = await currentCoordinates().catch(() => null);
      if (!coords) return;
      apiRequest('/technician/location', {
        method: 'POST',
        body: { ...coords, ...(workOrderId ? { work_order_id: workOrderId } : {}) },
        token,
        language,
      }).catch(() => undefined);
    };

    ping();
    const timer = setInterval(ping, intervalSeconds * 1000);
    const sub = AppState.addEventListener('change', (state) => {
      active = state === 'active';
      if (active) ping();
    });
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, [onDuty, token, language, intervalSeconds, workOrderId]);
}
