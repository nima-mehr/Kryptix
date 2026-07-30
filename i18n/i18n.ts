import {
  languageMeta as baseMeta,
  translations as baseTranslations,
  type TranslationKey,
} from './translations';
import { arOverrides, jaOverrides, trOverrides } from './locales/ar_tr_ja';
import { APP_LANGUAGES, isAppLanguage, type AppLanguage } from './languages';

const en = baseTranslations.en;

function merge(
  overrides: Partial<Record<TranslationKey, string>>
): Record<TranslationKey, string> {
  return { ...en, ...overrides };
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
  labelKey: TranslationKey;
  flag: string;
}[] = [
  ...baseMeta.map((m) => ({
    code: m.code as AppLanguage,
    labelKey: m.labelKey,
    flag: m.flag,
  })),
  { code: 'ar', labelKey: 'arabic' as TranslationKey, flag: '🇸🇦' },
  { code: 'tr', labelKey: 'turkish' as TranslationKey, flag: '🇹🇷' },
  { code: 'ja', labelKey: 'japanese' as TranslationKey, flag: '🇯🇵' },
];

/** Fallback labels if old TranslationKey union lacks new language name keys */
const LANG_NAME_FALLBACK: Partial<Record<AppLanguage, string>> = {
  ar: 'Arabic',
  tr: 'Turkish',
  ja: 'Japanese',
  en: 'English',
  fa: 'Persian',
  ru: 'Russian',
  de: 'German',
  fr: 'French',
  zh: 'Chinese',
};

export function languageDisplayName(
  code: AppLanguage,
  t: (key: TranslationKey) => string
): string {
  const meta = languageMeta.find((m) => m.code === code);
  if (!meta) return LANG_NAME_FALLBACK[code] ?? code;
  try {
    const label = t(meta.labelKey);
    if (label && label !== String(meta.labelKey)) return label;
  } catch {
    // fall through
  }
  return LANG_NAME_FALLBACK[code] ?? code;
}
