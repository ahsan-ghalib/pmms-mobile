import dayjs from 'dayjs';
import 'dayjs/locale/ar';
import type { TFunction } from 'i18next';

export function translatePriorityLabel(t: TFunction, priority?: string | null): string {
  const key = String(priority || '').toLowerCase();
  switch (key) {
    case 'high':
      return t('high_priority', 'High Priority');
    case 'medium':
      return t('medium_priority', 'Medium Priority');
    case 'low':
      return t('low_priority', 'Low Priority');
    default:
      return t('priority', 'Priority');
  }
}

/** Format dates with Arabic month names when language is Arabic. */
export function formatLocalizedDateTime(
  value?: string | Date | null,
  language?: string,
  pattern = 'DD MMM YYYY • hh:mm A',
): string {
  if (!value) return '—';
  const isArabic = Boolean(language?.startsWith('ar'));
  const parsed = dayjs(value);
  if (!parsed.isValid()) return '—';
  return parsed.locale(isArabic ? 'ar' : 'en').format(pattern);
}
