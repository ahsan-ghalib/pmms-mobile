type Translate = (key: string, fallback: string) => string;

export function notifyChatSendFailure(
  error: any,
  t: Translate,
  extras?: { onBlocked?: () => void; onClosed?: () => void },
) {
  const status = error?.response?.status;
  if (status === 423 || error?.response?.data?.is_blocked) {
    extras?.onBlocked?.();
    extras?.onClosed?.();
    alert(
      extras?.onClosed
        ? t('chat_closed', 'Chat is closed')
        : t('chat_blocked', 'You cannot send messages in this conversation.'),
    );
    return;
  }

  if (status === 413) {
    alert(
      t(
        'chat_file_too_large',
        'This file is too large to send. Choose a smaller image or a shorter video.',
      ),
    );
    return;
  }

  if (status === 422) {
    const errors = error?.response?.data?.errors;
    const first =
      errors?.attachments?.[0] || errors?.['attachments.0']?.[0] || error?.response?.data?.message;
    alert(first || t('chat_send_failed', 'Unable to send this message.'));
    return;
  }

  alert(t('chat_send_failed', 'Unable to send this message. Please try again.'));
}
