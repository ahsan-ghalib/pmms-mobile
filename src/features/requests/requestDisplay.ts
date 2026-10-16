import { ComponentProps } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/ar';
import { Complaint, complaintTitle } from '../home/complaints';
import { RequestFilter, RequestsCopy } from './requestsCopy';

dayjs.extend(relativeTime);

type TileIcon = ComponentProps<typeof MaterialCommunityIcons>['name'];

export function requestBucket(complaint: Complaint): Exclude<RequestFilter, 'all'> {
  switch (complaint.status) {
    case 'assigned':
      return complaint.scheduled_date ? 'scheduled' : 'open';
    case 'in_progress':
    case 'on_hold':
      return 'in_progress';
    case 'completed':
    case 'verified':
    case 'closed':
      return 'completed';
    default:
      return 'open';
  }
}

export function requestPill(complaint: Complaint, copy: RequestsCopy) {
  if (complaint.status === 'on_hold')
    return { label: copy.pill.on_hold, text: 'text-amber-700', bg: 'bg-amber-50' };
  if (complaint.status === 'closed')
    return { label: copy.pill.closed, text: 'text-slate-600', bg: 'bg-slate-100' };
  if (complaint.status === 'verified')
    return { label: copy.pill.verified, text: 'text-violet-600', bg: 'bg-violet-50' };
  switch (requestBucket(complaint)) {
    case 'in_progress':
      return { label: copy.pill.in_progress, text: 'text-emerald-600', bg: 'bg-emerald-50' };
    case 'scheduled':
      return { label: copy.pill.scheduled, text: 'text-brand-600', bg: 'bg-brand-50' };
    case 'completed':
      return { label: copy.pill.completed, text: 'text-violet-600', bg: 'bg-violet-50' };
    default:
      return { label: copy.pill.open, text: 'text-rose-500', bg: 'bg-rose-50' };
  }
}

export function categoryTile(categoryName?: string | null): {
  icon: TileIcon | 'ac-unit';
  color: string;
  bg: string;
} {
  const name = (categoryName || '').toLowerCase();
  if (name.includes('hvac') || name.includes('ac'))
    return { icon: 'ac-unit', color: '#E25563', bg: '#FDECEE' };
  if (name.includes('plumb')) return { icon: 'faucet', color: '#2F80F0', bg: '#E8F1FE' };
  if (name.includes('electric'))
    return { icon: 'lightbulb-outline', color: '#16A34A', bg: '#E6F6EC' };
  if (name.includes('civil') || name.includes('carpent'))
    return { icon: 'door', color: '#F08A24', bg: '#FEF0E2' };
  if (name.includes('paint')) return { icon: 'format-paint', color: '#DB2777', bg: '#FDE8F2' };
  if (name.includes('appliance'))
    return { icon: 'washing-machine', color: '#0EA5E9', bg: '#E0F4FD' };
  if (name.includes('elevator'))
    return { icon: 'elevator-passenger-outline', color: '#8B5CF6', bg: '#F1ECFE' };
  if (name.includes('housekeep') || name.includes('clean'))
    return { icon: 'broom', color: '#0D9488', bg: '#E3F7F4' };
  return { icon: 'hammer-wrench', color: '#2F80F0', bg: '#E8F1FE' };
}

export function requestTile(complaint: Complaint) {
  return categoryTile(complaint.category?.name_en);
}

const UPDATE_FIELDS = [
  'closed_at',
  'verified_at',
  'completed_at',
  'on_hold_at',
  'in_progress_at',
  'assigned_at',
] as const;

function lastUpdate(complaint: Complaint) {
  return UPDATE_FIELDS.map((field) => complaint[field])
    .filter((value): value is string => Boolean(value))
    .sort((a, b) => dayjs(b).valueOf() - dayjs(a).valueOf())[0];
}

export function requestActivity(complaint: Complaint, copy: RequestsCopy, language: string) {
  if (requestBucket(complaint) === 'scheduled' && complaint.scheduled_date) {
    const clock = (complaint.scheduled_start_time || '').slice(0, 5);
    const at = dayjs(`${complaint.scheduled_date.slice(0, 10)}T${clock || '00:00'}`).locale(
      language,
    );
    return copy.scheduledOn(at.format(clock ? 'D MMM YYYY, h:mm A' : 'D MMM YYYY'));
  }
  const updated = complaint.status === 'submitted' ? null : lastUpdate(complaint);
  if (updated) return copy.updated(dayjs(updated).locale(language).fromNow());
  const submitted = complaint.submitted_at || complaint.created_at;
  return submitted ? copy.submitted(dayjs(submitted).locale(language).fromNow()) : '';
}

export function requestActivityTime(complaint: Complaint) {
  return dayjs(complaint.submitted_at || complaint.created_at || 0).valueOf();
}

export function matchesSearch(complaint: Complaint, query: string, language: string) {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return [
    complaint.reference_no,
    complaintTitle(complaint, language),
    complaint.category?.name_en,
    complaint.category?.name_ar,
    complaint.unit?.name,
    complaint.property?.name,
    complaint.description,
  ]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(needle));
}
