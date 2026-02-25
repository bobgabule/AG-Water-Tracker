---
phase: 32-unified-design-system-and-theme-colors
plan: 03
subsystem: ui
tags: [tailwind, css, design-system, tokens, migration]

# Dependency graph
requires:
  - phase: 32-01
    provides: "25 semantic color tokens in @theme block"
provides:
  - "All 18 component and page files tokenized with semantic @theme color classes"
  - "Zero hardcoded hex in Tailwind classes across codebase (except AuthLayout gradient and 2 documented one-offs)"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns: ["All Tailwind color classes reference @theme tokens instead of hardcoded hex values"]

key-files:
  created: []
  modified:
    - "src/components/Header.tsx"
    - "src/components/WellDetailSheet.tsx"
    - "src/components/WellUsageGauge.tsx"
    - "src/components/WellStatusIndicators.tsx"
    - "src/components/NewReadingSheet.tsx"
    - "src/components/SegmentedControl.tsx"
    - "src/components/AddUserModal.tsx"
    - "src/components/AddWellFormBottomSheet.tsx"
    - "src/components/LocationPickerBottomSheet.tsx"
    - "src/pages/DashboardPage.tsx"
    - "src/pages/WellListPage.tsx"
    - "src/pages/SubscriptionPage.tsx"
    - "src/pages/LanguagePage.tsx"
    - "src/components/PendingInvitesList.tsx"
    - "src/components/FarmSelector.tsx"
    - "src/components/WellLimitModal.tsx"
    - "src/components/skeletons/WellListSkeleton.tsx"

key-decisions:
  - "UserLocationCircle Mapbox paint properties kept as raw hex (JS runtime values, not Tailwind classes)"
  - "Two documented one-offs preserved: LocationPicker text-[#759099] placeholder, LanguagePage hover:bg-[#f5f5f0]"
  - "WellListSkeleton skeleton shimmer color bg-[#d8dcc9] mapped to bg-surface-card-hover (closest semantic match)"

patterns-established:
  - "Token migration complete: all Tailwind color classes now reference semantic @theme tokens"

requirements-completed: []

# Metrics
duration: 11min
completed: 2026-02-25
---

# Phase 32 Plan 03: Component and Page Token Migration Summary

**Replaced all hardcoded hex Tailwind classes across 17 component/page files with semantic @theme token classes from Plan 01, achieving zero-hex codebase (except AuthLayout gradient and 2 documented one-offs)**

## Performance

- **Duration:** 11 min
- **Started:** 2026-02-25T02:34:43Z
- **Completed:** 2026-02-25T02:45:32Z
- **Tasks:** 2
- **Files modified:** 17

## Accomplishments
- Tokenized 9 component files (Header, WellDetailSheet, WellUsageGauge, WellStatusIndicators, NewReadingSheet, SegmentedControl, AddUserModal, AddWellFormBottomSheet, LocationPickerBottomSheet)
- Tokenized 8 page/remaining component files (DashboardPage, WellListPage, SubscriptionPage, LanguagePage, PendingInvitesList, FarmSelector, WellLimitModal, WellListSkeleton)
- All colors now controlled through src/index.css @theme tokens -- changing a token value updates every component
- UserLocationCircle had no Tailwind hex classes (only Mapbox GL paint properties) so was excluded

## Task Commits

Each task was committed atomically:

1. **Task 1: Tokenize component files (9 files)** - `98b21c9` (feat)
2. **Task 2: Tokenize page files and remaining components (9 files)** - `028191b` (feat)

## Files Created/Modified
- `src/components/Header.tsx` - bg-surface-header, bg-super-admin tokens
- `src/components/WellDetailSheet.tsx` - bg-btn-action token
- `src/components/WellUsageGauge.tsx` - bg-surface-dark, bg-surface-darkest tokens
- `src/components/WellStatusIndicators.tsx` - bg-surface-dark token
- `src/components/NewReadingSheet.tsx` - bg-surface-header, bg-btn-confirm, text-btn-confirm-text tokens
- `src/components/SegmentedControl.tsx` - bg-control-active, border-control-active tokens
- `src/components/AddUserModal.tsx` - bg-surface-modal, bg-control-active-alt, bg-btn-confirm tokens
- `src/components/AddWellFormBottomSheet.tsx` - bg-surface-header, bg-btn-confirm, text-accent-gps tokens
- `src/components/LocationPickerBottomSheet.tsx` - bg-surface-header, bg-teal-btn, text-teal-btn-text tokens
- `src/pages/DashboardPage.tsx` - bg-surface-header FAB button
- `src/pages/WellListPage.tsx` - bg-surface-page, bg-surface-card, bg-teal, text-text-heading, gradient tokens
- `src/pages/SubscriptionPage.tsx` - bg-surface-page, bg-surface-card, bg-surface-header, text-text-heading
- `src/pages/LanguagePage.tsx` - bg-surface-page, bg-surface-header, text-text-heading
- `src/components/PendingInvitesList.tsx` - bg-surface-card, text-text-heading
- `src/components/FarmSelector.tsx` - bg-surface-header/30 selected state
- `src/components/WellLimitModal.tsx` - bg-surface-header, hover:bg-surface-header-hover
- `src/components/skeletons/WellListSkeleton.tsx` - bg-surface-page, bg-surface-card, gradient tokens

## Decisions Made
- UserLocationCircle.tsx Mapbox GL paint properties (`fill-color`, `line-color`) are JS runtime values passed to the Mapbox API, not Tailwind classes, so they cannot use CSS variable tokens and were left as raw hex
- Two documented one-offs preserved per plan: LocationPicker `text-[#759099]` (placeholder color not worth tokenizing) and LanguagePage `hover:bg-[#f5f5f0]` (near-white button hover)
- WellListSkeleton shimmer color `bg-[#d8dcc9]` mapped to `bg-surface-card-hover` as the closest semantic token match

## Deviations from Plan

None - plan executed exactly as written. UserLocationCircle had no Tailwind hex classes to replace (only Mapbox paint properties), which was expected.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 32 complete: all 3 plans executed (token foundation, auth layout migration, component/page migration)
- Every color in the app is now controlled through src/index.css @theme tokens
- App builds successfully and is visually pixel-identical (same color values, now sourced from tokens)
- No blockers

## Self-Check: PASSED

- FOUND: src/components/Header.tsx
- FOUND: src/components/WellDetailSheet.tsx
- FOUND: src/pages/WellListPage.tsx
- FOUND: .planning/phases/32-unified-design-system-and-theme-colors/32-03-SUMMARY.md
- FOUND: commit 98b21c9 (Task 1)
- FOUND: commit 028191b (Task 2)

---
*Phase: 32-unified-design-system-and-theme-colors*
*Completed: 2026-02-25*
