import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { I18nManager } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import {
  AppLanguage,
  languageMeta,
  TranslationKey,
  translations,
} from '../i18n/translations';

type LanguageContextType = {
  language: AppLanguage;
  /** Always false — layout positions stay LTR for both languages */
  isRTL: boolean;
  setLanguage: (lang: AppLanguage) => Promise<void>;
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const LANGUAGE_KEY = 'kryptix_language';

/** Keep app layout LTR so controls never mirror when language changes. */
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
        if (saved === 'en' || saved === 'fa') {
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
    (key: TranslationKey, vars?: Record<string, string | number>) => {
      let str = translations[language][key] ?? translations.en[key] ?? String(key);
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
