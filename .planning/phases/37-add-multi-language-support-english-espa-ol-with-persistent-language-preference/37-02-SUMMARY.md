---
phase: 37-add-multi-language-support-english-espa-ol-with-persistent-language-preference
plan: 02
subsystem: ui
tags: [i18n, react-hooks, translations, spanish, english, auth, navigation, modals, error-handling]

# Dependency graph
requires:
  - phase: 37-01
    provides: useTranslation hook, translation files (en.ts/es.ts), languageStore
provides:
  - Auth pages (PhonePage, VerifyPage, NoSubscription) translated
  - SideMenu and Header translated with dynamic nav labels
  - Shared UI chrome translated (ConfirmDialog, LocationSoftAskModal, WellLimitModal)
  - Error components translated (ErrorFallback, LazyErrorBoundary)
  - Sync status and map offline overlay translated
affects: [37-03]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Imperative getTranslation() for class components using useLanguageStore.getState()"
    - "navItems array moved inside component body with useMemo for t() access"

key-files:
  created: []
  modified:
    - src/pages/auth/PhonePage.tsx
    - src/pages/auth/VerifyPage.tsx
    - src/pages/NoSubscriptionPage.tsx
    - src/components/SideMenu.tsx
    - src/components/Header.tsx
    - src/components/ConfirmDialog.tsx
    - src/components/LocationSoftAskModal.tsx
    - src/components/WellLimitModal.tsx
    - src/components/ErrorFallback.tsx
    - src/components/SyncStatusBanner.tsx
    - src/components/MapOfflineOverlay.tsx
    - src/components/LazyErrorBoundary.tsx
    - src/i18n/en.ts
    - src/i18n/es.ts

key-decisions:
  - "LazyErrorBoundary uses imperative getTranslation() since class components cannot call hooks"
  - "SideMenu navItems array moved inside component with useMemo([t]) for reactive translations"
  - "PageLoader left unchanged -- no visible text to translate (spinner only)"
  - "ConfirmDialog only translates its own Cancel button default; callers pass translated title/description/confirmText"

patterns-established:
  - "Class component i18n: useLanguageStore.getState().locale + translations[locale][key] direct lookup"

requirements-completed: [I18N-AUTH-NAV]

# Metrics
duration: 7min
completed: 2026-02-26
---

# Phase 37 Plan 02: Auth, Nav, and Chrome i18n Wiring Summary

**Wired useTranslation into 12 components: auth pages, SideMenu, Header, modals, error fallbacks, sync banner, and map offline overlay for full pre-login and chrome translation coverage**

## Performance

- **Duration:** 7 min
- **Started:** 2026-02-25T22:22:15Z
- **Completed:** 2026-02-25T22:29:36Z
- **Tasks:** 2
- **Files modified:** 14 (12 components + 2 translation files)

## Accomplishments
- All 3 auth pages (PhonePage, VerifyPage, NoSubscriptionPage) render translated text before login
- SideMenu nav labels, header text, logout button, and aria-labels translate on language switch
- Shared modals (ConfirmDialog, LocationSoftAskModal, WellLimitModal) show translated strings
- Error fallbacks, sync status banner, and map offline overlay speak the selected language
- LazyErrorBoundary (class component) uses imperative store access for translation

## Task Commits

Each task was committed atomically:

1. **Task 1: Wire translations into auth pages and SideMenu** - `5ed27aa` (feat)
2. **Task 2: Wire translations into modals, overlays, and error components** - `b4ad028` (feat)

## Files Created/Modified
- `src/pages/auth/PhonePage.tsx` - All strings translated (signIn, phoneNumber, sendCode, error messages, offline banner)
- `src/pages/auth/VerifyPage.tsx` - All strings translated (verifyPhone, codeSentTo, resend, errors)
- `src/pages/NoSubscriptionPage.tsx` - All strings translated (noFarmAccess, signedInAs, signOut)
- `src/components/SideMenu.tsx` - navItems moved inside component, all labels + logout + aria-labels translated
- `src/components/Header.tsx` - Water Tracker text and Open menu aria-label translated
- `src/components/ConfirmDialog.tsx` - Default Cancel button translated
- `src/components/LocationSoftAskModal.tsx` - Title, description, and all buttons translated
- `src/components/WellLimitModal.tsx` - Title, description, upgrade button, and close aria-label translated
- `src/components/ErrorFallback.tsx` - Both ErrorFallback and MapErrorFallback translated
- `src/components/SyncStatusBanner.tsx` - Offline, sync error, and syncing states translated
- `src/components/MapOfflineOverlay.tsx` - Offline/unavailable messages with plural well counts translated
- `src/components/LazyErrorBoundary.tsx` - App updated, offline, and page load error messages translated via imperative lookup
- `src/i18n/en.ts` - Added 7 new keys: app.waterTracker, nav.openMenu, error.pageLoadFailed, error.appUpdatedReloading, error.offlineCheck, error.reload, error.signOutFailed
- `src/i18n/es.ts` - Added matching 7 Spanish keys

## Decisions Made
- LazyErrorBoundary is a class component and cannot use React hooks. Created a `getTranslation()` helper that reads `useLanguageStore.getState().locale` directly -- simple, no re-render needed since the error UI is static.
- SideMenu navItems moved from module-level constant to `useMemo` inside the component so `t()` values update when locale changes.
- PageLoader has no visible text (only a CSS spinner), so no translation was needed.
- ConfirmDialog receives `title`, `description`, `confirmText`, and `confirmLoadingText` as props from callers -- only its own hardcoded "Cancel" default needed translation.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added 7 missing translation keys to en.ts and es.ts**
- **Found during:** Task 1 (pre-work for Task 2)
- **Issue:** Keys for LazyErrorBoundary messages (error.pageLoadFailed, error.appUpdatedReloading, error.offlineCheck, error.reload), Header (app.waterTracker, nav.openMenu), and SideMenu (error.signOutFailed) did not exist in translation files
- **Fix:** Added all 7 keys to both en.ts and es.ts before wiring components
- **Files modified:** src/i18n/en.ts, src/i18n/es.ts
- **Committed in:** 5ed27aa (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (missing critical)
**Impact on plan:** Translation keys were needed for components to compile. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All app chrome and pre-login pages are now translated
- Plan 03 can wire translations into remaining data pages (Dashboard, WellList, WellEdit, Readings, Allocations, Users, Reports, Settings, Subscription)

## Self-Check: PASSED

All 14 files verified present. Both task commits (5ed27aa, b4ad028) confirmed in git log.

---
*Phase: 37-add-multi-language-support-english-espa-ol-with-persistent-language-preference*
*Completed: 2026-02-26*
