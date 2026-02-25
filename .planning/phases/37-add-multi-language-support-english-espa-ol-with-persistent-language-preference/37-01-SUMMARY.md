---
phase: 37-add-multi-language-support-english-espa-ol-with-persistent-language-preference
plan: 01
subsystem: ui
tags: [i18n, zustand, react-hooks, translations, spanish, english]

# Dependency graph
requires: []
provides:
  - Zustand persist language store (ag-language localStorage key)
  - English and Spanish translation files with 351 matching keys
  - useTranslation() hook with interpolation, plurals, and English fallback
  - getRoleDisplayName(role, locale) for locale-aware role labels
  - LanguagePage wired to real language switching
affects: [37-02, 37-03]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "i18n flat key convention with dot-prefix grouping (nav.map, well.title)"
    - "Plural suffix convention: _one/_other with count param"
    - "Interpolation convention: {{variableName}} in translation strings"
    - "useTranslation() hook pattern returning { t, locale }"

key-files:
  created:
    - src/i18n/en.ts
    - src/i18n/es.ts
    - src/i18n/index.ts
    - src/stores/languageStore.ts
    - src/hooks/useTranslation.ts
  modified:
    - src/pages/LanguagePage.tsx
    - src/lib/permissions.ts

key-decisions:
  - "351 flat translation keys covering all ~32 source files with user-facing strings"
  - "useTranslation hook uses useCallback with locale dependency for stable reference"
  - "Plural resolution: count===1 picks _one suffix, else _other; missing suffix falls back to base key"
  - "getRoleDisplayName added alongside existing ROLE_DISPLAY_NAMES for backward compatibility"

patterns-established:
  - "i18n key naming: section.subsection format (e.g., auth.signIn, well.status.active)"
  - "Spanish agricultural terms: Gallons=Galones, Acre-Feet=Acres-Pie, Meter Checker=Lector de Medidores"

requirements-completed: [I18N-INFRA]

# Metrics
duration: 5min
completed: 2026-02-26
---

# Phase 37 Plan 01: i18n Infrastructure Summary

**Zustand language store with 351 English/Spanish translation keys, useTranslation hook with interpolation and plurals, and LanguagePage rewrite for instant switching**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-25T22:13:32Z
- **Completed:** 2026-02-25T22:18:58Z
- **Tasks:** 2
- **Files modified:** 7 (5 created, 2 modified)

## Accomplishments
- Built complete i18n infrastructure: language store, 351-key translation files, and useTranslation hook
- English and Spanish translation files cover all user-facing strings across 32+ source files
- LanguagePage reads/writes locale from Zustand store with instant re-render on language switch
- getRoleDisplayName function provides locale-aware role labels while preserving backward compatibility

## Task Commits

Each task was committed atomically:

1. **Task 1: Create language store, translation files, and useTranslation hook** - `341922a` (feat)
2. **Task 2: Rewrite LanguagePage and add getRoleDisplayName to permissions** - `b15ce87` (feat)

## Files Created/Modified
- `src/i18n/en.ts` - English translation object with 351 flat keys covering all app strings
- `src/i18n/es.ts` - Spanish translation object with 351 matching keys
- `src/i18n/index.ts` - Locale type, TranslationKey type, and translations registry export
- `src/stores/languageStore.ts` - Zustand persist store for language preference (key: ag-language)
- `src/hooks/useTranslation.ts` - useTranslation hook returning { t, locale } with interpolation and plurals
- `src/pages/LanguagePage.tsx` - Rewritten to use useTranslation and useLanguageStore for real language switching
- `src/lib/permissions.ts` - Added getRoleDisplayName(role, locale) function with ROLE_DISPLAY_NAMES_I18N map

## Decisions Made
- Used 351 flat translation keys (dot-prefixed grouping) rather than nested objects for simpler lookup and TypeScript inference
- useTranslation hook wraps the t function in useCallback with [locale] dependency for stable reference across renders
- Plural resolution tries suffixed key (_one/_other) first, falls back to base key if suffix is missing
- getRoleDisplayName added as a new export alongside existing ROLE_DISPLAY_NAMES to maintain backward compatibility

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Translation infrastructure ready for Plans 02 and 03 to wire useTranslation into all remaining components
- Language store persists across page reloads via localStorage
- All 351 keys are available for immediate use in any component

## Self-Check: PASSED

All 7 files verified present. Both task commits (341922a, b15ce87) confirmed in git log.

---
*Phase: 37-add-multi-language-support-english-espa-ol-with-persistent-language-preference*
*Completed: 2026-02-26*
