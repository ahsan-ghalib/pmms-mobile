const PRODUCTIVE_FAMILIES_AR_FROM = 'الاسر المنتجة';
const PRODUCTIVE_FAMILIES_AR_TO = 'الأسر المنتجة';

export function correctArabicLabel(value?: string | null): string {
  if (!value) {
    return '';
  }

  return value.replaceAll(PRODUCTIVE_FAMILIES_AR_FROM, PRODUCTIVE_FAMILIES_AR_TO);
}
