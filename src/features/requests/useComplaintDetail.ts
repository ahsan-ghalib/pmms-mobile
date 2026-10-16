import { useMutation, useQueryClient } from '@tanstack/react-query';
import { API_URL, apiRequest } from '../../lib/api';
import { useLanguage } from '../../i18n/LanguageContext';
import { useAuth } from '../auth/AuthContext';
import { Complaint } from '../home/complaints';
import { useAuthedQuery } from '../home/useTenantHome';

export const useComplaintDetail = (id: string) =>
  useAuthedQuery<Complaint>(`complaint-${id}`, `/complaints/${id}`);

export function useAddComplaintNote(id: string) {
  const { token } = useAuth();
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (note: string) =>
      apiRequest(`/complaints/${id}/notes`, { method: 'POST', body: { note }, token, language }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [`complaint-${id}`] }),
  });
}

export function useComplaintPhotoSource(complaintId: string) {
  const { token } = useAuth();
  return (photoId: string) => ({
    uri: `${API_URL}/complaints/${complaintId}/photos/${photoId}`,
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    cacheKey: `complaint-photo-${photoId}`,
  });
}
