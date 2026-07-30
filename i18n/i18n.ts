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
}[] = [
  ...baseMeta.map((m) => ({
    code: m.code as AppLanguage,
    labelKey: m.labelKey as LanguageLabelKey,
    flag: m.flag,
  })),
  { code: 'ar', labelKey: 'arabic', flag: '🇸🇦' },
  { code: 'tr', labelKey: 'turkish', flag: '🇹🇷' },
  { code: 'ja', labelKey: 'japanese', flag: '🇯🇵' },
  { code: 'es', labelKey: 'spanish', flag: '🇪🇸' },
  { code: 'pt', labelKey: 'portuguese', flag: '🇵🇹' },
  { code: 'it', labelKey: 'italian', flag: '🇮🇹' },
  { code: 'el', labelKey: 'greek', flag: '🇬🇷' },
  { code: 'ko', labelKey: 'korean', flag: '🇰🇷' },
];
