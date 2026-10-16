import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { I18nManager, Text } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import en from '../locales/en.json';
import ar from '../locales/ar.json';

const LANGUAGE_KEY = '@app_language';

const resources = {
  en: { translation: en },
  ar: { translation: ar },
};

export const initI18n = async () => {
  try {
    const savedLanguage = await AsyncStorage.getItem(LANGUAGE_KEY);
    // Default to 'en' if not set, as requested by the user
    const languageToUse = savedLanguage || 'en';

    if (i18n.isInitialized) {
      if (i18n.language !== languageToUse) {
        await i18n.changeLanguage(languageToUse);
      }
      return;
    }

    await i18n.use(initReactI18next).init({
      compatibilityJSON: 'v3',
      resources,
      lng: languageToUse,
      fallbackLng: 'en',
      interpolation: {
        escapeValue: false,
      },
    });

    const isRTL = languageToUse === 'ar';

    // Set global font on startup
    const CustomText = Text as any;
    CustomText.defaultProps = CustomText.defaultProps || {};
    let currentStyle = CustomText.defaultProps.style || {};
    if (Array.isArray(currentStyle)) {
      currentStyle = currentStyle.filter((s: any) => !s || !s.fontFamily);
    } else if (currentStyle.fontFamily) {
      const { fontFamily, ...rest } = currentStyle;
      currentStyle = rest;
    }
    CustomText.defaultProps.style = [
      currentStyle,
      { fontFamily: isRTL ? 'PlaypenSansArabic_500Medium' : 'Inter_400Regular' },
    ];

    if (I18nManager.isRTL !== isRTL) {
      I18nManager.allowRTL(isRTL);
      I18nManager.forceRTL(isRTL);
    }
  } catch (error) {
    console.error('Error initializing i18n', error);
  }
};

export const changeLanguage = async (lng: string) => {
  try {
    await AsyncStorage.setItem(LANGUAGE_KEY, lng);
    const isRTL = lng === 'ar';

    // Always change the language state first so it persists in JS if reload fails
    await i18n.changeLanguage(lng);

    // Keep push/inbox language in sync with the app (best-effort).
    try {
      const { AuthService } = await import('../api/services/auth.service');
      await AuthService.updateLanguage(lng.startsWith('ar') ? 'ar' : 'en');
    } catch {
      // Offline / logged out — local language still applies.
    }

    // Update global text font without reloading
    const CustomText = Text as any;
    CustomText.defaultProps = CustomText.defaultProps || {};
    // Extract existing styles excluding fontFamily
    let currentStyle = CustomText.defaultProps.style || {};
    if (Array.isArray(currentStyle)) {
      currentStyle = currentStyle.filter((s: any) => !s || !s.fontFamily);
    } else if (currentStyle.fontFamily) {
      const { fontFamily, ...rest } = currentStyle;
      currentStyle = rest;
    }

    CustomText.defaultProps.style = [
      currentStyle,
      { fontFamily: isRTL ? 'PlaypenSansArabic_500Medium' : 'Inter_400Regular' },
    ];

    // Check if RTL needs to change
    if (I18nManager.isRTL !== isRTL) {
      I18nManager.allowRTL(isRTL);
      I18nManager.forceRTL(isRTL);
      // We will handle RTL dynamically on the root layout
    }
  } catch (error) {
    console.error('Error changing language', error);
  }
};

export default i18n;

// Force reload JSON
