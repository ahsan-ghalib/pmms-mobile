import { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import 'dayjs/locale/ar';
import { HomeCopy } from './homeCopy';

type IconName = ComponentProps<typeof Ionicons>['name'];

export type Complaint = {
  id: string;
  reference_no: string;
  status: string;
  priority?: string;
  description?: string | null;
  scheduled_date?: string | null;
  scheduled_start_time?: string | null;
  scheduled_end_time?: string | null;
  submitted_at?: string | null;
  assigned_at?: string | null;
  in_progress_at?: string | null;
  on_hold_at?: string | null;
  completed_at?: string | null;
  verified_at?: string | null;
  closed_at?: string | null;
  created_at?: string | null;
  category?: { name_en?: string; name_ar?: string; name?: string } | null;
  service?: { name_en?: string; name_ar?: string; name?: string } | null;
  property?: { id: string; name: string } | null;
  unit?: { id: string; name: string } | null;
  supervisor_name?: string | null;
  photos?: { id: string; original_name?: string | null; mime_type?: string | null }[];
  status_history?: {
    id: string;
    from_status?: string | null;
    to_status: string;
    notes?: string | null;
    changed_at?: string | null;
  }[];
  notes?: {
    id: string;
    note: string;
    user_id?: number | string | null;
    created_at?: string | null;
  }[];
};

export const OPEN_STATUSES = ['submitted', 'assigned'];
export const PROGRESS_STATUSES = ['in_progress', 'on_hold'];
export const DONE_STATUSES = ['completed', 'verified', 'closed'];
const ACTIVE_STATUSES = [...OPEN_STATUSES, ...PROGRESS_STATUSES];

export function localizedName(value: Complaint['service'], language: string) {
  if (!value) return '';
  return (language === 'ar' ? value.name_ar : value.name_en) || value.name_en || value.name || '';
}

export function complaintTitle(complaint: Complaint, language: string) {
  return (
    localizedName(complaint.service, language) ||
    localizedName(complaint.category, language) ||
    complaint.reference_no
  );
}

export function categoryVisual(complaint: Complaint): {
  icon: IconName;
  color: string;
  bg: string;
} {
  const name = (complaint.category?.name_en || '').toLowerCase();
  if (name.includes('hvac') || name.includes('ac'))
    return { icon: 'snow-outline', color: '#2563EB', bg: '#EAF2FF' };
  if (name.includes('plumb')) return { icon: 'water-outline', color: '#0284C7', bg: '#E6F4FD' };
  if (name.includes('electric')) return { icon: 'bulb-outline', color: '#D97706', bg: '#FEF3DC' };
  if (name.includes('elevator'))
    return { icon: 'swap-vertical-outline', color: '#4F46E5', bg: '#EEF0FF' };
  if (name.includes('housekeep') || name.includes('clean'))
    return { icon: 'sparkles-outline', color: '#0D9488', bg: '#E3F7F4' };
  if (name.includes('civil')) return { icon: 'hammer-outline', color: '#475569', bg: '#EEF2F6' };
  return { icon: 'construct-outline', color: '#2563EB', bg: '#EAF2FF' };
}

export function statusBadge(complaint: Complaint, copy: HomeCopy) {
  switch (complaint.status) {
    case 'submitted':
      return {
        label: copy.status.submitted,
        text: 'text-rose-600',
        bg: 'bg-rose-50',
        icon: 'alert-circle' as IconName,
        iconColor: '#E11D48',
      };
    case 'assigned':
      return complaint.scheduled_date
        ? { label: copy.status.scheduled, text: 'text-emerald-700', bg: 'bg-emerald-50' }
        : { label: copy.status.assigned, text: 'text-violet-700', bg: 'bg-violet-50' };
    case 'in_progress':
      return { label: copy.status.in_progress, text: 'text-brand-600', bg: 'bg-brand-50' };
    case 'on_hold':
      return { label: copy.status.on_hold, text: 'text-amber-700', bg: 'bg-amber-50' };
    case 'completed':
    case 'verified':
      return {
        label: copy.status[complaint.status],
        text: 'text-emerald-700',
        bg: 'bg-emerald-50',
      };
    default:
      return { label: copy.status.closed, text: 'text-slate-600', bg: 'bg-slate-100' };
  }
}

export function formatDate(value: string | null | undefined, language: string) {
  if (!value) return '';
  return dayjs(value).locale(language).format('MMM DD, YYYY');
}

function timeOf(date: string, time?: string | null) {
  const clock = (time || '').slice(0, 5);
  return dayjs(`${date.slice(0, 10)}T${clock || '00:00'}`);
}

export function upcomingVisit(complaints: Complaint[]) {
  const now = dayjs();
  return complaints
    .filter((row) => row.scheduled_date && ACTIVE_STATUSES.includes(row.status))
    .map((row) => ({ row, start: timeOf(row.scheduled_date as string, row.scheduled_start_time) }))
    .filter(({ start }) => !start.isBefore(now, 'day'))
    .sort((a, b) => a.start.valueOf() - b.start.valueOf())[0]?.row;
}

export function visitWindow(complaint: Complaint, copy: HomeCopy, language: string) {
  const date = complaint.scheduled_date as string;
  const start = timeOf(date, complaint.scheduled_start_time).locale(language);
  const end = complaint.scheduled_end_time
    ? timeOf(date, complaint.scheduled_end_time).locale(language)
    : null;
  const day = start.isSame(dayjs(), 'day')
    ? copy.today
    : start.isSame(dayjs().add(1, 'day'), 'day')
      ? copy.tomorrow
      : start.format('ddd, MMM D');
  const hasTime = Boolean(complaint.scheduled_start_time);
  return hasTime
    ? `${day}, ${start.format('h:mm A')}${end ? ` – ${end.format('h:mm A')}` : ''}`
    : day;
}
