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
import { applyFaqOverrides } from './faqOverrides';
import { walletStringOverrides } from './walletStrings';

const enBase = baseTranslations.en;
const enWallet = walletStringOverrides.en ?? {};

/** Ensure faq7 + wallet keys exist on the English base so TranslationKey typing stays happy at runtime */
const en = applyFaqOverrides('en', {
  ...enBase,
  ...enWallet,
  faq7q: enBase.faq7q ?? 'How does the iOS share sheet work for backups?',
  faq7a:
    enBase.faq7a ??
    'After Encrypt & share, iOS shows the system share sheet with your .kryptix file. To keep a copy on the device: choose Save to Files → On My iPhone or iCloud Drive → Save. You can also AirDrop, Mail, or Messages. To restore later: Settings → Backup → Import .kryptix → Choose file from the Files app. The export passphrase is required to decrypt — store it safely offline.',
  walletNetworks:
    enWallet.walletNetworks ??
    'Also other EVM networks that use this address format.',
  walletWarning:
    enWallet.walletWarning ??
    'Important: select the same network in your wallet when sending. Wrong network can mean lost funds.',
  walletWhatCanSend:
    enWallet.walletWhatCanSend ??
    'You can send native coins (ETH, BNB, …) and tokens (e.g. USDT, USDC) on those networks.',
}) as Record<TranslationKey, string>;

function mergeLang(
  lang: AppLanguage,
  overrides: Record<string, string>
): Record<TranslationKey, string> {
  const wallet = walletStringOverrides[lang] ?? {};
  return applyFaqOverrides(lang, {
    ...en,
    ...(overrides as Partial<Record<TranslationKey, string>>),
    ...wallet,
  }) as Record<TranslationKey, string>;
}

export type { AppLanguage, TranslationKey };
export { isAppLanguage, APP_LANGUAGES };

export const translations: Record<AppLanguage, Record<TranslationKey, string>> = {
  en,
  fa: mergeLang('fa', baseTranslations.fa),
  ru: mergeLang('ru', baseTranslations.ru),
  de: mergeLang('de', baseTranslations.de),
  fr: mergeLang('fr', baseTranslations.fr),
  zh: mergeLang('zh', baseTranslations.zh),
  ar: mergeLang('ar', arOverrides),
  tr: mergeLang('tr', trOverrides),
  ja: mergeLang('ja', jaOverrides),
  es: mergeLang('es', esOverrides),
  pt: mergeLang('pt', ptOverrides),
  it: mergeLang('it', itOverrides),
  el: mergeLang('el', elOverrides),
  ko: mergeLang('ko', koOverrides),
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
