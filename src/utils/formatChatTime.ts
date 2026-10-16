export function formatChatTime(value?: string | Date | null): string {
  if (!value) {
    return '';
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const label = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  return `\u2066${label}\u2069`;
}

export const chatTimeTextStyle = {
  direction: 'ltr' as const,
  writingDirection: 'ltr' as const,
};
