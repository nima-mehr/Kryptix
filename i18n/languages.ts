/** Canonical language list — import from here in LanguageContext / UI */
export type AppLanguage =
  | 'en'
  | 'fa'
  | 'ru'
  | 'de'
  | 'fr'
  | 'zh'
  | 'ar'
  | 'tr'
  | 'ja'
  | 'es'
  | 'pt'
  | 'it'
  | 'el'
  | 'ko';

export const APP_LANGUAGES: AppLanguage[] = [
  'en',
  'fa',
  'ru',
  'de',
  'fr',
  'zh',
  'ar',
  'tr',
  'ja',
  'es',
  'pt',
  'it',
  'el',
  'ko',
];

export function isAppLanguage(value: string): value is AppLanguage {
  return (APP_LANGUAGES as string[]).includes(value);
}
