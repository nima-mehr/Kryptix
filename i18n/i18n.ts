import {
  languageMeta as baseMeta,
  translations as baseTranslations,
  type TranslationKey,
} from './translations';
import { arOverrides, jaOverrides, trOverrides } from './locales/ar_tr_ja';
import {
  elOverrides,
  esOverrides,
  itOverrides,
  koOverrides,
  ptOverrides,
} from './locales/es_pt_it_el_ko';
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
  es: merge(esOverrides),
  pt: merge(ptOverrides),
  it: merge(itOverrides),
  el: merge(elOverrides),
  ko: merge(koOverrides),
};

/** Always-visible endonym — not translated with the UI language */
export const NATIVE_LANGUAGE_NAMES: Record<AppLanguage, string> = {
  en: 'English',
  fa: 'فارسی',
  ru: 'Русский',
  de: 'Deutsch',
  fr: 'Français',
  zh: '中文',
  ar: 'العربية',
  tr: 'Türkçe',
  ja: '日本語',
  es: 'Español',
  pt: 'Português',
  it: 'Italiano',
  el: 'Ελληνικά',
  ko: '한국어',
};

export type LanguageLabelKey =
  | TranslationKey
  | 'arabic'
  | 'turkish'
  | 'japanese'
  | 'spanish'
  | 'portuguese'
  | 'italian'
  | 'greek'
  | 'korean';

export const languageMeta: {
  code: AppLanguage;
  labelKey: LanguageLabelKey;
  flag: string;
  /** Fixed name in that language’s own script */
  nativeName: string;
}[] = [
  { code: 'en', labelKey: 'english', flag: '🇬🇧', nativeName: NATIVE_LANGUAGE_NAMES.en },
  { code: 'fa', labelKey: 'persian', flag: '🇮🇷', nativeName: NATIVE_LANGUAGE_NAMES.fa },
  { code: 'ru', labelKey: 'russian', flag: '🇷🇺', nativeName: NATIVE_LANGUAGE_NAMES.ru },
  { code: 'de', labelKey: 'german', flag: '🇩🇪', nativeName: NATIVE_LANGUAGE_NAMES.de },
  { code: 'fr', labelKey: 'french', flag: '🇫🇷', nativeName: NATIVE_LANGUAGE_NAMES.fr },
  { code: 'zh', labelKey: 'chinese', flag: '🇨🇳', nativeName: NATIVE_LANGUAGE_NAMES.zh },
  { code: 'ar', labelKey: 'arabic', flag: '🇸🇦', nativeName: NATIVE_LANGUAGE_NAMES.ar },
  { code: 'tr', labelKey: 'turkish', flag: '🇹🇷', nativeName: NATIVE_LANGUAGE_NAMES.tr },
  { code: 'ja', labelKey: 'japanese', flag: '🇯🇵', nativeName: NATIVE_LANGUAGE_NAMES.ja },
  { code: 'es', labelKey: 'spanish', flag: '🇪🇸', nativeName: NATIVE_LANGUAGE_NAMES.es },
  { code: 'pt', labelKey: 'portuguese', flag: '🇵🇹', nativeName: NATIVE_LANGUAGE_NAMES.pt },
  { code: 'it', labelKey: 'italian', flag: '🇮🇹', nativeName: NATIVE_LANGUAGE_NAMES.it },
  { code: 'el', labelKey: 'greek', flag: '🇬🇷', nativeName: NATIVE_LANGUAGE_NAMES.el },
  { code: 'ko', labelKey: 'korean', flag: '🇰🇷', nativeName: NATIVE_LANGUAGE_NAMES.ko },
];
