import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type AppLanguage = 'en' | 'ar';

const STORAGE_KEY = 'pmms_language';

export const LANGUAGE_LABELS: Record<AppLanguage, string> = {
  en: 'English',
  ar: 'العربية',
};

const FONTS = {
  en: {
    regular: 'font-inter',
    medium: 'font-inter-medium',
    semibold: 'font-inter-semibold',
    bold: 'font-inter-bold',
    extrabold: 'font-inter-extrabold',
  },
  ar: {
    regular: 'font-cairo',
    medium: 'font-cairo-semibold',
    semibold: 'font-cairo-bold',
    bold: 'font-cairo-bold',
    extrabold: 'font-cairo-extrabold',
  },
};

type LanguageContextValue = {
  language: AppLanguage;
  setLanguage: (language: AppLanguage) => void;
  isAr: boolean;
  font: (typeof FONTS)['en'];
  row: 'flex-row' | 'flex-row-reverse';
  align: 'text-left' | 'text-right';
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<AppLanguage>('en');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((value) => {
        if (value === 'en' || value === 'ar') setLanguageState(value);
      })
      .catch(() => {});
  }, []);

  const setLanguage = useCallback((next: AppLanguage) => {
    setLanguageState(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
  }, []);

  const value = useMemo<LanguageContextValue>(() => {
    const isAr = language === 'ar';
    return {
      language,
      setLanguage,
      isAr,
      font: FONTS[language],
      row: isAr ? 'flex-row-reverse' : 'flex-row',
      align: isAr ? 'text-right' : 'text-left',
    };
  }, [language, setLanguage]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used inside LanguageProvider');
  return context;
}
