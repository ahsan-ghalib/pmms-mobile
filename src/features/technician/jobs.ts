import dayjs from 'dayjs';
import 'dayjs/locale/ar';
import { categoryTile } from '../requests/requestDisplay';
import type { PartRequest, PartUsage } from './parts';
import { TechnicianCopy } from './technicianCopy';

type Named = { id: string; name: string } | null;
type Localized = { id: string; name_en: string; name_ar?: string | null } | null;

export type JobAssignment = {
  id: string;
  technician_id: string;
  technician_name?: string | null;
  assignment_type?: 'primary' | 'coworker' | string | null;
  removed_at?: string | null;
};

export type JobCheckin = {
  id: string;
  checked_in_at: string;
  distance_from_site_meters?: number | null;
};

export type CompanySettings = {
  require_asset_scan_to_start: boolean;
  require_gps_checkin: boolean;
  require_gps_checkout: boolean;
  require_before_photos: boolean;
  require_after_photos: boolean;
  tracking_interval_seconds: number;
};

export type Job = {
  id: string;
  work_order_no: string;
  status: string;
  priority?: string | null;
  type?: string | null;
  description?: string | null;
  service_summary?: string | null;
  scheduled_date?: string | null;
  scheduled_start_time?: string | null;
  scheduled_end_time?: string | null;
  hold_reason?: string | null;
  accepted_at?: string | null;
  completed_at?: string | null;
  asset_id?: string | null;
  asset_validated_at?: string | null;
  property_id?: string | null;
  unit_id?: string | null;
  property_name?: string | null;
  unit_name?: string | null;
  location_name?: string | null;
  sub_location_name?: string | null;
  proximity_meters?: number | null;
  can_accept?: boolean;
  readonly?: boolean;
  property?: (Named & { latitude?: number | null; longitude?: number | null }) | null;
  location?: Named;
  sub_location?: Named;
  unit?: Named;
  category?: Localized;
  service?: Localized;
  asset?: { id: string; asset_code: string; name: string } | null;
  assignments?: JobAssignment[];
  checkins?: JobCheckin[];
  checkouts?: { id: string; checked_out_at: string }[];
  reschedule_requests?: {
    id: string;
    status: 'pending' | 'approved' | 'rejected';
    reason: string;
    review_reason?: string | null;
    created_at: string;
  }[];
  part_requests?: PartRequest[];
  part_usages?: PartUsage[];
  company_settings?: CompanySettings;
};

export const ACTIVE_STATUSES = ['created', 'assigned', 'reopened', 'in_progress', 'on_hold'];
export const DONE_STATUSES = ['completed', 'verified', 'closed'];
const NOT_STARTED = ['created', 'assigned', 'reopened'];

export function localized(value: Localized | undefined, language: string) {
  if (!value) return '';
  return (language === 'ar' && value.name_ar) || value.name_en;
}

export function jobTitle(job: Job, language: string, copy: TechnicianCopy) {
  return localized(job.service, language) || localized(job.category, language) || copy.untitled;
}

export function jobPlace(job: Job) {
  const unit = job.unit_name ?? job.unit?.name;
  const area = job.sub_location_name ?? job.sub_location?.name;
  const property = job.property_name ?? job.property?.name;
  return [unit || area, property].filter(Boolean).join(' • ');
}

export function jobTile(job: Job) {
  return categoryTile(job.category?.name_en);
}

function scheduledEnd(job: Job) {
  if (!job.scheduled_date) return null;
  const clock = (job.scheduled_end_time || '23:59:59').slice(0, 8);
  return dayjs(`${job.scheduled_date.slice(0, 10)}T${clock}`);
}

export function isOverdue(job: Job, now = dayjs()) {
  const end = scheduledEnd(job);
  return Boolean(end && NOT_STARTED.includes(job.status) && end.isBefore(now));
}

export function isCurrent(job: Job) {
  return job.status === 'in_progress';
}

export function jobPill(job: Job, copy: TechnicianCopy) {
  if (isOverdue(job)) return { label: copy.pill.overdue, text: 'text-rose-600', bg: 'bg-rose-50' };
  switch (job.status) {
    case 'in_progress':
      return { label: copy.pill.in_progress, text: 'text-emerald-600', bg: 'bg-emerald-50' };
    case 'on_hold':
      return { label: copy.pill.on_hold, text: 'text-amber-700', bg: 'bg-amber-50' };
    case 'completed':
    case 'verified':
      return { label: copy.pill[job.status], text: 'text-violet-600', bg: 'bg-violet-50' };
    case 'closed':
    case 'cancelled':
      return { label: copy.pill[job.status], text: 'text-slate-600', bg: 'bg-slate-100' };
    case 'reopened':
      return { label: copy.pill.reopened, text: 'text-orange-600', bg: 'bg-orange-50' };
    default:
      return job.accepted_at
        ? { label: copy.pill.accepted, text: 'text-sky-700', bg: 'bg-sky-50' }
        : { label: copy.pill.assigned, text: 'text-brand-600', bg: 'bg-brand-50' };
  }
}

function clock(time: string | null | undefined, language: string) {
  if (!time) return null;
  return dayjs(`2000-01-01T${time.slice(0, 8)}`)
    .locale(language)
    .format('h:mm A');
}

export function jobWindow(job: Job, copy: TechnicianCopy, language: string) {
  if (!job.scheduled_date) return copy.noSchedule;
  const date = dayjs(job.scheduled_date.slice(0, 10)).locale(language);
  const today = dayjs().startOf('day');
  const day = date.isSame(today, 'day')
    ? copy.today
    : date.isSame(today.add(1, 'day'), 'day')
      ? copy.tomorrow
      : date.format('ddd, D MMM');
  const times = [clock(job.scheduled_start_time, language), clock(job.scheduled_end_time, language)]
    .filter(Boolean)
    .join(' – ');
  return times ? `${day}, ${times}` : day;
}

export function scheduleSortKey(job: Job) {
  if (!job.scheduled_date) return Number.MAX_SAFE_INTEGER;
  const start = (job.scheduled_start_time || '00:00:00').slice(0, 8);
  return dayjs(`${job.scheduled_date.slice(0, 10)}T${start}`).valueOf();
}

export function formatDistance(meters?: number | null) {
  if (meters == null) return null;
  return meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toFixed(1)} km`;
}
