import { useCallback } from 'react';
import { useLanguageStore } from '../stores/languageStore';
import { translations } from '../i18n/index';

/**
 * Translation hook providing locale-aware string resolution.
 *
 * Supports:
 * - Interpolation: `t('auth.codeSentTo', { phone: '+1234' })`
 * - Plurals: `t('time.daysAgo', { count: 3 })` resolves to `time.daysAgo_other`
 * - English fallback: missing keys in current locale fall back to English, then to the raw key
 */
export function useTranslation() {
  const locale = useLanguageStore((s) => s.locale);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      const dict = translations[locale];
      const fallback = translations['en'];

      // Determine the actual lookup key, handling plurals
      let resolvedKey = key;
      if (params?.count !== undefined) {
        const suffix = Number(params.count) === 1 ? '_one' : '_other';
        const pluralKey = key + suffix;
        // Use the plural key if it exists in any locale; otherwise fall back to base key
        if (dict[pluralKey] || fallback[pluralKey]) {
          resolvedKey = pluralKey;
        }
      }

      // Look up: current locale -> English fallback -> raw key
      let resolved = dict[resolvedKey] ?? fallback[resolvedKey] ?? resolvedKey;

      // Interpolate {{paramName}} placeholders
      if (params) {
        resolved = resolved.replace(/\{\{(\w+)\}\}/g, (_match, name: string) => {
          return params[name] !== undefined ? String(params[name]) : `{{${name}}}`;
        });
      }

      return resolved;
    },
    [locale],
  );

  return { t, locale };
}
