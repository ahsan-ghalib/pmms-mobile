import { useQuery } from '@tanstack/react-query';
import { apiRequest, unwrap } from '../../lib/api';
import { useLanguage } from '../../i18n/LanguageContext';
import { useAuth } from '../auth/AuthContext';
import { Complaint } from './complaints';

export type ComplaintContext = {
  default: {
    property_id?: string;
    unit_id?: string | null;
    property?: { id: string; name: string; code?: string } | null;
    unit?: { id: string; name: string; code?: string } | null;
  } | null;
};

export type InboxNotification = {
  id: string;
  title: string;
  body: string;
  entity_type?: string | null;
  read_at?: string | null;
  created_at?: string | null;
};

export function useAuthedQuery<T>(key: string, path: string, enabled = true) {
  const { token } = useAuth();
  const { language } = useLanguage();
  return useQuery({
    queryKey: [key, token, language],
    enabled: Boolean(token) && enabled,
    queryFn: async () => unwrap<T>(await apiRequest(path, { token, language })),
  });
}

export const useComplaints = () => useAuthedQuery<Complaint[]>('complaints', '/complaints');
export const useComplaintContext = () =>
  useAuthedQuery<ComplaintContext>('complaint-context', '/complaints/context');
export const useNotifications = () =>
  useAuthedQuery<InboxNotification[]>('notifications', '/notifications');
