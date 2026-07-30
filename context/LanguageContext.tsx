import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Alert, I18nManager } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import {
  AppLanguage,
  languageMeta,
  TranslationKey,
  translations,
} from '../i18n/translations';

type LanguageContextType = {
  language: AppLanguage;
  isRTL: boolean;
  setLanguage: (lang: AppLanguage) => Promise<void>;
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const LANGUAGE_KEY = 'kryptix_language';

export const LanguageProvider = ({ children }: { children: React.ReactNode }) => {
  const [language, setLanguageState] = useState<AppLanguage>('en');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const saved = await SecureStore.getItemAsync(LANGUAGE_KEY);
        if (saved === 'en' || saved === 'fa') {
          setLanguageState(saved);
          const wantRtl = saved === 'fa';
          if (I18nManager.isRTL !== wantRtl) {
            I18nManager.allowRTL(wantRtl);
            I18nManager.forceRTL(wantRtl);
          }
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
    try {
      await SecureStore.setItemAsync(LANGUAGE_KEY, lang);
    } catch {
      // ignore
    }

    const wantRtl = lang === 'fa';
    const rtlChanged = I18nManager.isRTL !== wantRtl;
    if (rtlChanged) {
      I18nManager.allowRTL(wantRtl);
      I18nManager.forceRTL(wantRtl);
    }

    const dict = translations[lang];
    if (rtlChanged) {
      Alert.alert(dict.languageChanged, dict.languageChangedBody, [
        { text: dict.ok },
      ]);
    }
  }, []);

  const t = useCallback(
    (key: TranslationKey, vars?: Record<string, string | number>) => {
      let str = translations[language][key] ?? translations.en[key] ?? key;
      if (vars) {
        Object.entries(vars).forEach(([k, v]) => {
          str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
        });
      }
      return str;
    },
    [language]
  );

  const isRTL = language === 'fa';

  const value = useMemo(
    () => ({ language, isRTL, setLanguage, t }),
    [language, isRTL, setLanguage, t]
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
