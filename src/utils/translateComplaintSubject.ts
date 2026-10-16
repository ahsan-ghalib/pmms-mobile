import type { TFunction } from 'i18next';

/** Stored complaint.subject codes → i18n keys (some codes differ from labels). */
const SUBJECT_I18N_KEY: Record<string, string> = {
  defective: 'defective_item',
  defective_item: 'defective_item',
  wrong_item: 'wrong_item',
  no_longer_needed: 'no_longer_needed',
  size_fit: 'size_fit',
  wrong_defective: 'wrong_defective',
  image_mismatch: 'image_mismatch',
  quality: 'quality',
  changed_mind: 'changed_mind',
  other: 'other',
};

const SUBJECT_FALLBACK_EN: Record<string, string> = {
  defective_item: 'Defective Item',
  wrong_item: 'Wrong Item Delivered',
  no_longer_needed: 'No Longer Needed',
  size_fit: 'Size/Fit',
  wrong_defective: 'Wrong/Defective Item',
  image_mismatch: 'Image Mismatch',
  quality: 'Quality Issue',
  changed_mind: 'Changed Mind',
  other: 'Other',
  complaint: 'Complaint',
};

/**
 * Translate a complaint subject code (e.g. image_mismatch) for display.
 * Falls back to a cleaned title-case string for unknown custom subjects.
 */
export function translateComplaintSubject(t: TFunction, subject?: string | null): string {
  const raw = String(subject || '').trim();
  if (!raw) {
    return t('complaint', 'Complaint');
  }

  const normalized = raw.toLowerCase().replace(/\s+/g, '_');
  const key = SUBJECT_I18N_KEY[normalized] || normalized;
  const fallback =
    SUBJECT_FALLBACK_EN[key] || raw.replace(/_/g, ' ').replace(/\b\w/g, (ch) => ch.toUpperCase());

  const translated = t(key, fallback);
  // If key missing, i18next often returns the key itself — avoid showing snake_case.
  if (!translated || translated === key) {
    return fallback;
  }
  return translated;
}
