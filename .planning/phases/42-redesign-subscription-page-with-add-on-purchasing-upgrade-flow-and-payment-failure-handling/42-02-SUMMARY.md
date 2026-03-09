---
phase: 42-redesign-subscription-page-with-add-on-purchasing
plan: 02
subsystem: ui
tags: [react, tailwind, stripe, headless-ui, subscription, permissions]

# Dependency graph
requires:
  - phase: 42-01
    provides: purchase-addons edge function, translation keys for subscription features
provides:
  - Redesigned SubscriptionPage with 2-col desktop layout, add-on purchasing, upgrade dialog
  - view_subscription permission for admin access to subscription page
  - Interactive quantity counters for purchasing wells, admin seats, meter checker seats
  - Upgrade confirmation dialog with proration preview
affects: [subscription, permissions, navigation]

# Tech tracking
tech-stack:
  added: []
  patterns: [quantity-counter-component, 2-col-responsive-grid, proration-preview-dialog]

key-files:
  created: []
  modified:
    - src/pages/SubscriptionPage.tsx
    - src/lib/permissions.ts
    - src/App.tsx
    - src/components/SideMenu.tsx
    - src/i18n/es.ts

key-decisions:
  - "view_subscription permission added to ACTIONS array and admin role set, enabling admin view-only access"
  - "QuantityCounter component uses controlled state with min 0 bound for clean add-on UX"
  - "Upgrade dialog fetches proration preview before showing confirm button to avoid surprise charges"
  - "Cancel subscription link styled text-white/30 to be intentionally subtle and non-prominent"
  - "Admin role sees full page content but purchase/upgrade/cancel actions hidden behind isOwner check"

patterns-established:
  - "QuantityCounter: reusable minus/count/plus control with disabled state at zero"
  - "Two-phase API pattern: preview mode for proration then confirm for execution"

requirements-completed: []

# Metrics
duration: 3min
completed: 2026-03-09
---

# Phase 42 Plan 02: Subscription Page Redesign Summary

**Responsive 2-column subscription page with interactive add-on purchasing via quantity counters, upgrade dialog with proration preview, and view_subscription permission for admin access**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-09T10:42:42Z
- **Completed:** 2026-03-09T10:46:00Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Added view_subscription permission granting admin role access to subscription page alongside owner/super_admin
- Complete SubscriptionPage rewrite with 2-column desktop layout (single column mobile), dark cards, AG watermark
- Interactive add-on purchasing with quantity counters for wells ($100/mo), admin seats ($100/mo), meter checkers ($50/mo)
- Upgrade confirmation dialog with proration preview via update-subscription edge function
- Subtle cancel subscription link at page bottom for owner/super_admin only
- Failed payment banner with Pay Now button redirecting to Stripe Portal
- Added missing Spanish translation keys for all new subscription features

## Task Commits

Each task was committed atomically:

1. **Task 1: Add view_subscription permission** - `a997c00` (feat)
2. **Task 2: Rewrite SubscriptionPage** - `88c709e` (feat)

## Files Created/Modified
- `src/lib/permissions.ts` - Added view_subscription action and admin permission
- `src/App.tsx` - Changed subscription route guard from manage_farm to view_subscription
- `src/components/SideMenu.tsx` - Updated subscription nav item requiredAction
- `src/pages/SubscriptionPage.tsx` - Complete rewrite with 2-col layout, add-on purchasing, upgrade dialog
- `src/i18n/es.ts` - Added missing Spanish translations for new subscription keys

## Decisions Made
- view_subscription permission grants admin view-only access; super_admin and owner get it automatically via ALL_ACTIONS/ALL_EXCEPT_CROSS_FARM sets
- QuantityCounter component is inline (not extracted to separate file) since it is only used on this page
- Upgrade dialog uses two-phase approach: preview first to show proration amount, then confirm to execute
- Cancel subscription link intentionally styled with very low opacity (text-white/30) to discourage impulsive cancellations
- Admin role can view all subscription details but cannot see purchase/upgrade/cancel actions (guarded by isOwner)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added missing Spanish translation keys**
- **Found during:** Task 2 (SubscriptionPage rewrite)
- **Issue:** Spanish translation file (es.ts) was missing keys added in Phase 42-01 (subtitle, nextBilling, upgradePlan, currentUsage, activeWells, admin, meterChecker, purchaseAddOns, addOnSubtitle, wellsAddon, adminSeatsAddon, meterCheckersAddon, totalDueToday, proratedNote, confirmPurchase, purchasing, purchaseSuccess, upgradeTitle, upgradeDesc, confirmUpgrade, upgrading, payNow)
- **Fix:** Added all missing Spanish translation keys to es.ts
- **Files modified:** src/i18n/es.ts
- **Verification:** TypeScript compilation passes
- **Committed in:** 88c709e (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical)
**Impact on plan:** Essential for i18n completeness. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Subscription page redesign complete with all interactive features
- Ready for Phase 42 Plan 03 execution
- purchase-addons and update-subscription edge functions already deployed from previous phases

---
*Phase: 42-redesign-subscription-page-with-add-on-purchasing*
*Completed: 2026-03-09*
