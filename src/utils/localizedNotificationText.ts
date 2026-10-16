/**
 * Pick notification title/body for the current app language.
 * English lives in `title`/`body`; Arabic in `title_ar`/`body_ar`.
 */
export function localizedNotificationText(
  item: {
    title?: string | null;
    body?: string | null;
    title_ar?: string | null;
    body_ar?: string | null;
  },
  language?: string | null,
): { title: string; body: string } {
  const isAr = String(language || 'en')
    .toLowerCase()
    .startsWith('ar');
  const title = isAr
    ? String(item.title_ar || item.title || '')
    : String(item.title || item.title_ar || '');
  const body = isAr
    ? String(item.body_ar || item.body || '')
    : String(item.body || item.body_ar || '');

  return { title, body };
}
