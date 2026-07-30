import {
  languageMeta as baseMeta,
  translations as baseTranslations,
  type TranslationKey,
} from './translations';
import { arOverrides, jaOverrides, trOverrides } from './locales/ar_tr_ja';
import { APP_LANGUAGES, isAppLanguage, type AppLanguage } from './languages';

const en = baseTranslations.en;

function merge(overrides: Record<string, string>): Record<TranslationKey, string> {
  return { ...en, ...(overrides as Partial<Record<TranslationKey, string>>) };
}

export type { AppLanguage, TranslationKey };
export { isAppLanguage, APP_LANGUAGES };

export const translations: Record<AppLanguage, Record<TranslationKey, string>> = {
  en,
  fa: baseTranslations.fa,
  ru: baseTranslations.ru,
  de: baseTranslations.de,
  fr: baseTranslations.fr,
  zh: baseTranslations.zh,
  ar: merge(arOverrides),
  tr: merge(trOverrides),
  ja: merge(jaOverrides),
};

export const languageMeta: {
  code: AppLanguage;
  labelKey: TranslationKey | 'arabic' | 'turkish' | 'japanese';
  flag: string;
}[] = [
  ...baseMeta.map((m) => ({
    code: m.code as AppLanguage,
    labelKey: m.labelKey,
    flag: m.flag,
  })),
  { code: 'ar', labelKey: 'arabic', flag: '🇸🇦' },
  { code: 'tr', labelKey: 'turkish', flag: '🇹🇷' },
  { code: 'ja', labelKey: 'japanese', flag: '🇯🇵' },
];
