---
phase: 42-redesign-subscription-page-with-add-on-purchasing
plan: 03
subsystem: i18n
tags: [i18n, translations, powersync, sync-rules]

# Dependency graph
requires:
  - phase: 42-01
    provides: purchase-addons edge function and simplified subscription page
provides:
  - Updated English and Spanish translation keys for subscription redesign
  - PowerSync sync rules documentation with extra_wells, subscription_status, current_period_end
affects: [subscription-page, powersync-dashboard]

# Tech tracking
tech-stack:
  added: []
  patterns: []

key-files:
  created: []
  modified:
    - src/i18n/en.ts
    - src/i18n/es.ts
    - docs/powersync-sync-rules.yaml

key-decisions:
  - "Used 'finca' instead of 'granja' in Spanish subtitle for consistency with existing translations"
  - "Removed 4 unused keys (perEach, additionalAdmins, additionalWells, additionalMeterCheckers) and added 22 new keys for subscription redesign"

patterns-established: []

requirements-completed: []

# Metrics
duration: 3min
completed: 2026-03-09
---

# Phase 42 Plan 03: i18n & Sync Rules Summary

**Updated 22 subscription translation keys (EN/ES) for add-on purchasing, upgrade flow, and prorated billing; documented 3 new PowerSync sync rule columns**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-09T10:42:52Z
- **Completed:** 2026-03-09T10:45:35Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments
- Removed 4 unused subscription translation keys from both EN and ES
- Added 22 new subscription translation keys for the redesigned page (add-on purchasing, upgrade flow, proration)
- Updated PowerSync sync rules documentation with extra_wells, subscription_status, current_period_end columns

## Task Commits

Each task was committed atomically:

1. **Task 1: Update English translations** - `f442803` (feat)
2. **Task 2: Update Spanish translations** - `fc49eaf` (feat)
3. **Task 3: Update PowerSync sync rules documentation** - `d60fd75` (docs)

## Files Created/Modified
- `src/i18n/en.ts` - Removed 4 unused keys, added 22 new subscription keys for redesigned page
- `src/i18n/es.ts` - Mirror of English changes with appropriate Spanish translations
- `docs/powersync-sync-rules.yaml` - Added extra_wells, subscription_status, current_period_end to user_farms data query

## Decisions Made
- Used "finca" instead of "granja" in Spanish subtitle for consistency with all other farm references in the Spanish translation file
- Removed 4 unused keys (perEach, additionalAdmins, additionalWells, additionalMeterCheckers) that are replaced by the new add-on purchasing keys

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed inconsistent Spanish farm terminology**
- **Found during:** Task 2
- **Issue:** The working tree had "granja" (generic farm) instead of "finca" (the term used throughout the Spanish translations)
- **Fix:** Changed "granja" to "finca" in subscription.subtitle
- **Files modified:** src/i18n/es.ts
- **Verification:** Grep confirmed all farm references in es.ts now use "finca"
- **Committed in:** fc49eaf (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Minor terminology fix for translation consistency. No scope creep.

## Issues Encountered
- docs/ directory is gitignored; used `git add -f` to force-add the sync rules documentation file

## User Setup Required

- PowerSync Dashboard sync rules need updating with extra_wells, subscription_status, current_period_end columns in user_farms bucket

## Next Phase Readiness
- All i18n keys ready for the redesigned subscription page UI (42-02)
- Sync rules documented; manual dashboard update needed for PowerSync

---
*Phase: 42-redesign-subscription-page-with-add-on-purchasing*
*Completed: 2026-03-09*

## Self-Check: PASSED
