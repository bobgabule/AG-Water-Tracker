---
phase: 40-update-subscription-page-with-hybrid-approach
plan: 02
subsystem: ui
tags: [react, stripe, tailwind, headless-ui, supabase-edge-functions, i18n]

# Dependency graph
requires:
  - phase: 40-update-subscription-page-with-hybrid-approach
    provides: Stripe edge functions (get-subscription-details, create-portal-session, update-subscription)
  - phase: 20-subscription-limits-and-page
    provides: existing subscription page, useSubscriptionTier, useSeatUsage hooks
  - phase: 37-multi-language-support
    provides: useTranslation hook, i18n translation files
provides:
  - useStripeSubscription hook for live Stripe data (status, payment method, invoices)
  - PlanChangeModal with proration preview and upgrade/downgrade confirmation
  - Rewritten SubscriptionPage with 5 sections (failed payment, plan, usage, payment, transactions)
  - 18 new English and Spanish translation keys for subscription UI
affects: [stripe-webhooks, subscription-management, billing]

# Tech tracking
tech-stack:
  added: []
  patterns: [useEffect with ignore flag for async cleanup, Stripe portal deep-link flow_type, skeleton loading for async Stripe data alongside instant PowerSync data]

key-files:
  created:
    - src/hooks/useStripeSubscription.ts
    - src/components/PlanChangeModal.tsx
  modified:
    - src/pages/SubscriptionPage.tsx
    - src/i18n/en.ts
    - src/i18n/es.ts

key-decisions:
  - "useStripeSubscription fetches via GET to cancel-subscription edge function (repurposed as get-subscription-details)"
  - "PlanChangeModal useEffect includes ignore flag cleanup to prevent stale state updates on unmount"
  - "Upgrade button uses bg-btn-action (green), downgrade button uses bg-gray-400 for visual hierarchy"
  - "Plan change button restricted to owner and super_admin roles via useUserRole hook"
  - "Status badge colors: active=green-700, past_due=red-700, canceled=gray-600, trialing=blue-700"

patterns-established:
  - "Hybrid loading: PowerSync data (seats/wells) renders instantly, Stripe data shows skeletons until loaded"
  - "Portal deep-link: openPortal(flowType?) helper wraps create-portal-session edge function with window.open"

requirements-completed: [SUB-01, SUB-02, SUB-03, SUB-05, SUB-06, SUB-07, SUB-09]

# Metrics
duration: 5min
completed: 2026-03-06
---

# Phase 40 Plan 02: Frontend Subscription Page Summary

**Rewritten SubscriptionPage with plan status badges, proration preview modal, payment method display, failed payment banner, recent transactions, and seat/well usage progress bars**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-06T13:49:34Z
- **Completed:** 2026-03-06T13:54:17Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- useStripeSubscription hook fetches live Stripe data (subscription status, payment method, invoices) with camelCase mapping
- PlanChangeModal shows proration preview for upgrades and informational message for downgrades with Headless UI Dialog
- SubscriptionPage rewritten with 5 stacked sections: failed payment banner, current plan with status badge, usage with progress bars, payment method with Stripe Portal link, recent transactions with receipt links
- 18 new translation keys in both English and Spanish for all subscription UI strings
- Only owners see the upgrade/downgrade button via useUserRole check

## Task Commits

Each task was committed atomically:

1. **Task 1: Create useStripeSubscription hook and PlanChangeModal component** - `66ad314` (feat)
2. **Task 2: Rewrite SubscriptionPage with all sections and update translations** - `3e6c435` (feat)

## Files Created/Modified
- `src/hooks/useStripeSubscription.ts` - Hook fetching live Stripe subscription data via edge function
- `src/components/PlanChangeModal.tsx` - Confirmation modal with proration preview for plan changes
- `src/pages/SubscriptionPage.tsx` - Rewritten subscription page with all 5 sections
- `src/i18n/en.ts` - 18 new English translation keys for subscription UI
- `src/i18n/es.ts` - 18 new Spanish translation keys for subscription UI

## Decisions Made
- useStripeSubscription invokes the cancel-subscription edge function (repurposed as get-subscription-details per Plan 01)
- PlanChangeModal useEffect includes an `ignore` flag cleanup to prevent stale state updates if modal closes during fetch
- Upgrade button styled with bg-btn-action (green) for positive action; downgrade button styled with bg-gray-400 (gray) for caution
- Plan change restricted to owner and super_admin roles via useUserRole hook
- Status badge uses semantic colors: green for active, red for past_due, gray for canceled, blue for trialing
- Stripe sections show skeleton placeholders while loading; PowerSync-backed usage section renders instantly

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Added useEffect cleanup with ignore flag in PlanChangeModal**
- **Found during:** Task 2 (code review)
- **Issue:** PlanChangeModal's fetchPreview async function could set state after modal closed
- **Fix:** Added `let ignore = false` pattern with cleanup return to prevent stale state updates
- **Files modified:** src/components/PlanChangeModal.tsx
- **Verification:** TypeScript passes, cleanup correctly prevents setState on unmounted state
- **Committed in:** 3e6c435 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug fix)
**Impact on plan:** Cleanup pattern prevents a potential React state update warning. No scope creep.

## Issues Encountered
None

## User Setup Required
None - this plan only adds frontend code. Stripe products/prices and edge function secrets must already be configured per Plan 01's setup requirements.

## Next Phase Readiness
- Phase 40 complete: both backend (Plan 01) and frontend (Plan 02) subscription management shipped
- Stripe products, prices, and secrets must be configured before testing
- PowerSync sync rules must include the 4 Stripe farms columns
- Stripe Customer Portal must be enabled in Stripe Dashboard

## Self-Check: PASSED

- All 5 files exist on disk
- Both task commits (66ad314, 3e6c435) found in git log
- Must-have artifacts verified: useStripeSubscription export exists, PlanChangeModal contains proration, SubscriptionPage contains all 5 sections

---
*Phase: 40-update-subscription-page-with-hybrid-approach*
*Completed: 2026-03-06*
