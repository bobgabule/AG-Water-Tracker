import en from './en';
import es from './es';

export type Locale = 'en' | 'es';

export type TranslationKey = keyof typeof en;

export const translations: Record<Locale, Record<string, string>> = { en, es };
