/** Canonical language list — import from here in LanguageContext / UI */
export type AppLanguage = 'en' | 'fa' | 'ru' | 'de' | 'fr' | 'zh' | 'ar' | 'tr' | 'ja';

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
];

export function isAppLanguage(value: string): value is AppLanguage {
  return (APP_LANGUAGES as string[]).includes(value);
}
