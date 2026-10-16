/** Vendors usually save the on-video caption as `title`, not `description`. */
export function getPostCaption(...sources: unknown[]): string {
  const keys = [
    'description',
    'caption',
    'postCaption',
    'post_caption',
    'title',
    'post_description',
  ] as const;

  for (const source of sources) {
    if (!source || typeof source !== 'object') {
      continue;
    }
    const record = source as Record<string, unknown>;
    for (const key of keys) {
      const value = record[key];
      if (typeof value === 'string' && value.trim()) {
        return value.trim();
      }
    }
  }

  return '';
}
