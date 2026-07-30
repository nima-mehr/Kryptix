import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { I18nManager } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import {
  AppLanguage,
  isAppLanguage,
  languageMeta,
  translations,
  type TranslationKey,
} from '../i18n/i18n';

type LanguageContextType = {
  language: AppLanguage;
  /** Always false — layout positions stay LTR for all languages */
  isRTL: boolean;
  setLanguage: (lang: AppLanguage) => Promise<void>;
  t: (key: TranslationKey | string, vars?: Record<string, string | number>) => string;
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const LANGUAGE_KEY = 'kryptix_language';

const LANG_NAME_SOFT: Record<string, Record<string, string>> = {
  arabic: { ar: 'العربية', default: 'Arabic' },
  turkish: { tr: 'Türkçe', default: 'Turkish' },
  japanese: { ja: '日本語', default: 'Japanese' },
  spanish: { es: 'Español', default: 'Spanish' },
  portuguese: { pt: 'Português', default: 'Portuguese' },
  italian: { it: 'Italiano', default: 'Italian' },
  greek: { el: 'Ελληνικά', default: 'Greek' },
  korean: { ko: '한국어', default: 'Korean' },
};

function ensureLtrLayout() {
  try {
    I18nManager.allowRTL(false);
    if (I18nManager.isRTL) {
      I18nManager.forceRTL(false);
    }
  } catch {
    // ignore
  }
}

export const LanguageProvider = ({ children }: { children: React.ReactNode }) => {
  const [language, setLanguageState] = useState<AppLanguage>('en');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        ensureLtrLayout();
        const saved = await SecureStore.getItemAsync(LANGUAGE_KEY);
        if (saved && isAppLanguage(saved)) {
          setLanguageState(saved);
        }
      } catch {
        // keep default
      } finally {
        setLoaded(true);
      }
    };
    load();
  }, []);

  const setLanguage = useCallback(async (lang: AppLanguage) => {
    setLanguageState(lang);
    ensureLtrLayout();
    try {
      await SecureStore.setItemAsync(LANGUAGE_KEY, lang);
    } catch {
      // ignore
    }
  }, []);

  const t = useCallback(
    (key: TranslationKey | string, vars?: Record<string, string | number>) => {
      const table = translations[language] ?? translations.en;
      let str =
        (table as Record<string, string>)[key] ??
        (translations.en as Record<string, string>)[key] ??
        String(key);

      if (str === String(key) && LANG_NAME_SOFT[key]) {
        const names = LANG_NAME_SOFT[key];
        str = names[language] ?? names.default;
      }

      if (vars) {
        Object.entries(vars).forEach(([k, v]) => {
          str = str.split(`{${k}}`).join(String(v));
        });
      }
      return str;
    },
    [language]
  );

  const value = useMemo(
    () => ({ language, isRTL: false, setLanguage, t }),
    [language, setLanguage, t]
  );

  if (!loaded) {
    return null;
  }

  return (
    <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return ctx;
};

export { languageMeta };
export type { AppLanguage, TranslationKey };
