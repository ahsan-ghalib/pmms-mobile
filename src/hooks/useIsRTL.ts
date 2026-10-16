import { useTranslation } from 'react-i18next';

/**
 * Live RTL flag for layout decisions.
 *
 * `I18nManager.isRTL` is snapshotted when the app launches, and `changeLanguage`
 * deliberately skips a reload, so that flag stays stale until the next restart.
 * Read the active language instead — it updates the moment the user switches.
 */
export function useIsRTL(): boolean {
  const { i18n } = useTranslation();
  return (i18n.language || 'en').startsWith('ar');
}
