# Phase 20: Subscription Limits & Page - Research

**Researched:** 2026-02-22
**Domain:** Subscription tier enforcement (well limits, seat limits, subscription page)
**Confidence:** HIGH

## Summary

Phase 20 implements well count enforcement and minor upgrades to existing seat limit UX and subscription page. The heavy lifting is already done -- `useSubscriptionTier`, `useSeatUsage`, `useAppSetting`, and the `SubscriptionPage` all exist and work. The main new work is: (1) a lightweight "Well Limit Reached" modal triggered from "New Well" buttons on DashboardPage and WellListPage, (2) adding an "Upgrade Plan" link to the AddUserModal seat-full state, (3) appending `?farm_id=X&tier=slug` query params to all external subscription URLs, (4) updating the subscription page well count query from `status = 'active'` to all non-deleted wells, and (5) adding a "Manage Subscription" link on the Settings page for growers.

No new libraries are needed. All patterns already exist in the codebase. The modal follows the exact Headless UI v2 Dialog pattern used by `ConfirmDeleteWellDialog`. Well count uses local PowerSync data for offline enforcement.

**Primary recommendation:** Build a single reusable `WellLimitModal` component using the existing Dialog pattern, then wire it into both DashboardPage and WellListPage before the location picker flow starts.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- "New Well" button stays tappable at capacity -- tapping it shows a limit modal
- Modal appears in BOTH locations: DashboardPage map and WellListPage
- Limit check happens at button tap (before location picker flow starts)
- Only growers/admins see the "New Well" button (existing behavior) -- modal follows same gating
- Well count = all non-deleted wells (includes inactive/disabled, excludes deleted)
- Instant revert when well is deleted (count drops below limit, button works again)
- Offline: client-side enforcement using local PowerSync data; allow creation if tier data hasn't loaded yet (rare edge case -- server-side enforcement deferred to TIER-D1)
- Simple modal: text + button, no icon or illustration
- Friendly + helpful tone: Title "Well Limit Reached", message "You've reached your well limit. Upgrade your plan for more wells."
- "Upgrade Plan" button (primary) opens external subscription website URL
- Close via X button or tap outside -- no separate dismiss button
- For growers: shows "Upgrade Plan" button linking to external site
- For admins: generic "Well limit reached" with dismiss only (no upgrade CTA)
- If subscription_website_url not configured: show disabled "Upgrade Plan" button
- All "Upgrade Plan" / "Manage Plan" links append query params: ?farm_id=X&tier=starter
- Consistent across: well limit modal, seat limit area, subscription page "Manage Plan" button
- Opens in system browser (standard PWA behavior)
- Keep existing AddUserModal behavior (disabled roles + "All seats filled" message)
- ADD: "Upgrade Plan" link alongside "All seats are filled" message -- opens external URL
- Same external URL pattern with farm_id + tier params
- Upgrade link visible to growers only
- Contextual: limit modals (well + seat) show upgrade when limits hit
- Persistent: add "Manage Subscription" link on Settings page (growers only)
- No "approaching limit" warnings -- only at capacity
- Upgrade links visible to growers only everywhere
- Existing subscription page is good as-is (tier name, seat usage, well count, "Manage Plan" button)
- Update well count query to match enforcement logic: all non-deleted wells (currently only active)
- "Manage Plan" button passes ?farm_id=X&tier=slug (currently just opens base URL)
- Access restricted to growers only (currently gated by manage_farm permission -- verify this maps to growers only)

### Claude's Discretion
- Exact modal component implementation (reuse existing dialog patterns)
- Well count query optimization
- Settings page link placement and styling
- Error state handling for missing tier data

### Deferred Ideas (OUT OF SCOPE)
- Server-side well limit enforcement (TIER-D1) -- future release
- Stripe Customer Portal integration (AUTH-D1) -- future milestone
- "Approaching limit" warnings -- decided against for now, could revisit
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| TIER-06 | Well count enforcement -- disable "New Well" button at tier limit (Basic: 5, Pro: 10) | Well count hook from existing `useSubscriptionTier` + new `useWellCount` query on PowerSync local data; WellLimitModal component using Headless UI Dialog v2 pattern; intercept button tap in DashboardPage and WellListPage |
| TIER-07 | Seat limit enforcement reads from DB-driven tier config instead of hardcoded constants | Already implemented via `useSeatUsage` + `useSubscriptionTier` hooks (Phase 18). Remaining: add "Upgrade Plan" link to AddUserModal's "All seats filled" state |
| TIER-08 | Subscription page shows current tier, usage per role, well count, and "Manage Plan" placeholder | SubscriptionPage already exists with all display elements. Remaining: fix well count query (remove `status = 'active'` filter), add `tier` param to Manage Plan URL |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @headlessui/react | v2 | Dialog/Modal component for well limit modal | Already used throughout project for all dialogs |
| @heroicons/react | v2 | XMarkIcon for close button, ArrowTopRightOnSquareIcon for external links | Already used throughout project |
| @powersync/react | v0.x | `useQuery` for local-first well count queries | Already used for all data queries |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| react-router | v7 | Navigation to settings subscription link | Already used for all routing |

### Alternatives Considered
None -- all libraries already in use, no new dependencies needed.

**Installation:**
```bash
# No new packages needed
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── components/
│   └── WellLimitModal.tsx       # NEW: reusable modal for well limit reached
├── hooks/
│   └── useWellCount.ts          # NEW: well count query hook
├── lib/
│   └── subscriptionUrls.ts     # NEW: shared URL builder for external subscription links
├── pages/
│   ├── DashboardPage.tsx        # MODIFY: intercept New Well tap with limit check
│   ├── WellListPage.tsx         # MODIFY: intercept New Well tap with limit check
│   ├── SubscriptionPage.tsx     # MODIFY: fix well count query, add tier to URL
│   └── SettingsPage.tsx         # MODIFY: add "Manage Subscription" link
└── components/
    └── AddUserModal.tsx         # MODIFY: add "Upgrade Plan" link to seats-full state
```

### Pattern 1: Well Limit Check at Button Tap
**What:** When user taps "New Well", check `wellCount >= tier.maxWells` before starting the location picker flow. If at limit, show the WellLimitModal instead.
**When to use:** Both DashboardPage and WellListPage "New Well" button handlers.
**Example:**
```typescript
// In DashboardPage.tsx or WellListPage.tsx
const tier = useSubscriptionTier();
const wellCount = useWellCount();

const handleNewWell = useCallback(() => {
  // Allow creation if tier data hasn't loaded (offline edge case)
  if (tier && wellCount >= tier.maxWells) {
    setShowLimitModal(true);
    return;
  }
  // proceed with normal flow...
  setCurrentStep('location');
}, [tier, wellCount]);
```

### Pattern 2: Reusable WellLimitModal Component
**What:** A simple Headless UI v2 Dialog following the exact same pattern as `ConfirmDeleteWellDialog`. No icon, just text and button.
**When to use:** Anywhere the well limit needs to be communicated.
**Example:**
```typescript
// Source: existing project patterns (ConfirmDeleteWellDialog.tsx)
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface WellLimitModalProps {
  open: boolean;
  onClose: () => void;
  upgradeUrl: string | null;  // null = no URL configured
  isGrower: boolean;          // controls whether upgrade CTA shows
}
```

### Pattern 3: Shared External URL Builder
**What:** A utility function that constructs the external subscription URL with `?farm_id=X&tier=slug` query params. Used by: WellLimitModal, AddUserModal upgrade link, SubscriptionPage "Manage Plan" button, Settings page link.
**When to use:** Any place that links to the external subscription website.
**Example:**
```typescript
// src/lib/subscriptionUrls.ts
export function buildSubscriptionUrl(
  baseUrl: string,
  farmId: string,
  tierSlug: string
): string {
  const separator = baseUrl.includes('?') ? '&' : '?';
  return `${baseUrl}${separator}farm_id=${farmId}&tier=${tierSlug}`;
}
```

### Pattern 4: useWellCount Hook
**What:** A lightweight hook that queries `COUNT(*) FROM wells WHERE farm_id = ?` from local PowerSync data.
**When to use:** DashboardPage and WellListPage for limit checking. SubscriptionPage for display.
**Example:**
```typescript
// src/hooks/useWellCount.ts
import { useMemo } from 'react';
import { useQuery } from '@powersync/react';
import { useAuth } from '../lib/AuthProvider';

export function useWellCount(): number {
  const { onboardingStatus } = useAuth();
  const farmId = onboardingStatus?.farmId ?? null;

  const query = farmId
    ? `SELECT COUNT(*) as count FROM wells WHERE farm_id = ?`
    : 'SELECT NULL WHERE 0';

  const { data } = useQuery<{ count: number }>(query, farmId ? [farmId] : []);

  return useMemo(() => data?.[0]?.count ?? 0, [data]);
}
```

### Anti-Patterns to Avoid
- **Disabling the "New Well" button:** User decision says button stays tappable; tapping shows a modal. Do NOT disable or gray out the button.
- **Using `useWells().wells.length` for count:** This loads all well data unnecessarily. Use a dedicated `COUNT(*)` query instead.
- **Filtering by status in well count:** User explicitly decided well count includes all non-deleted wells. Do NOT filter by `status = 'active'`. Wells are hard-deleted (`DELETE FROM wells`), so `COUNT(*) FROM wells WHERE farm_id = ?` is correct.
- **Duplicating URL construction:** Build the `?farm_id=X&tier=slug` URL in one place and reuse. Do NOT construct it differently in each component.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Modal/Dialog | Custom modal with manual backdrop, focus trap, escape handling | `@headlessui/react` Dialog, DialogBackdrop, DialogPanel | Accessibility, keyboard nav, focus management all built-in |
| URL query param construction | String concatenation scattered across components | Single `buildSubscriptionUrl()` utility | Consistent params, easy to change, no ? vs & bugs |

**Key insight:** This phase is primarily wiring -- connecting existing hooks and patterns into new UI locations. There is very little novel code to write.

## Common Pitfalls

### Pitfall 1: Well Count Query Mismatch Between Enforcement and Display
**What goes wrong:** The subscription page shows one well count (e.g., `status = 'active'`) but enforcement uses a different count (all wells). User sees "4/5 wells" but can't create a new one.
**Why it happens:** Phase 18 decision used `status = 'active'`, but Phase 20 CONTEXT.md overrides to "all non-deleted wells."
**How to avoid:** Use the same `useWellCount` hook everywhere -- SubscriptionPage display AND DashboardPage/WellListPage enforcement. No status filter. The hook should return the count of ALL wells for the farm.
**Warning signs:** SubscriptionPage well count differs from enforcement count.

### Pitfall 2: Forgetting the Offline Edge Case
**What goes wrong:** If `useSubscriptionTier()` returns `null` (tier data not synced yet), the limit check blocks well creation entirely.
**Why it happens:** Null tier means `tier.maxWells` throws. Developers add a guard that treats null tier as "at limit."
**How to avoid:** Per user decision: "allow creation if tier data hasn't loaded yet." Null tier = no enforcement.
**Warning signs:** Well creation doesn't work when first launching the app offline.

### Pitfall 3: Upgrade Link Visible to Wrong Roles
**What goes wrong:** Admin users see "Upgrade Plan" links that should only be shown to growers.
**Why it happens:** The modal is shared between growers and admins but upgrade CTA visibility differs.
**How to avoid:** Pass `isGrower` (or user role) to the modal component. Show upgrade CTA only when `role === 'grower' || role === 'super_admin'`. For admins, show dismiss-only modal.
**Warning signs:** Admin sees "Upgrade Plan" button in the well limit modal.

### Pitfall 4: Missing Separator in URL Construction
**What goes wrong:** URL becomes `https://example.com?existing=1?farm_id=X` (double `?`).
**Why it happens:** Base URL already has query params, but code blindly prepends `?`.
**How to avoid:** The `buildSubscriptionUrl` utility checks for existing `?` and uses `&` if present (same pattern already in SubscriptionPage).
**Warning signs:** External links have malformed URLs.

### Pitfall 5: manage_farm Permission Not Limited to Growers
**What goes wrong:** Subscription page accessible to admins if `manage_farm` action is granted to admin role.
**Why it happens:** Assumption that `manage_farm` maps only to growers.
**How to avoid:** Verify the permission matrix. Current matrix shows `manage_farm` is NOT in admin's permission set -- only `super_admin` and `grower` have it. This is correct per user decision.
**Warning signs:** Admin role can navigate to /subscription.

## Code Examples

### WellLimitModal Component (Full Pattern)
```typescript
// Source: project pattern from ConfirmDeleteWellDialog.tsx
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react';
import { XMarkIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';

interface WellLimitModalProps {
  open: boolean;
  onClose: () => void;
  upgradeUrl: string | null;
  isGrower: boolean;
}

export default function WellLimitModal({
  open,
  onClose,
  upgradeUrl,
  isGrower,
}: WellLimitModalProps) {
  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-black/50 transition-opacity duration-300 ease-out data-[closed]:opacity-0"
      />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel
          transition
          className="w-full max-w-sm bg-gray-800 rounded-2xl p-6 shadow-xl transition duration-300 ease-out data-[closed]:scale-95 data-[closed]:opacity-0"
        >
          {/* Close button */}
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-white/10 transition-colors"
              aria-label="Close"
            >
              <XMarkIcon className="h-5 w-5 text-gray-400" />
            </button>
          </div>

          <DialogTitle className="text-lg font-semibold text-white mb-2">
            Well Limit Reached
          </DialogTitle>

          <p className="text-gray-400 text-sm mb-6">
            You've reached your well limit. Upgrade your plan for more wells.
          </p>

          {isGrower && (
            <a
              href={upgradeUrl ?? '#'}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center justify-center gap-2 w-full bg-[#5f7248] text-white rounded-lg px-4 py-3 font-medium text-sm hover:bg-[#4e6339] transition-colors ${
                !upgradeUrl ? 'opacity-50 pointer-events-none' : ''
              }`}
              aria-disabled={!upgradeUrl}
            >
              Upgrade Plan
              <ArrowTopRightOnSquareIcon className="h-4 w-4" />
            </a>
          )}
        </DialogPanel>
      </div>
    </Dialog>
  );
}
```

### Integrating Limit Check in DashboardPage
```typescript
// In DashboardPage.tsx -- modification to existing handleNewWell
import { useSubscriptionTier } from '../hooks/useSubscriptionTier';
import { useWellCount } from '../hooks/useWellCount';
import WellLimitModal from '../components/WellLimitModal';

// Inside component:
const tier = useSubscriptionTier();
const wellCount = useWellCount();
const [showLimitModal, setShowLimitModal] = useState(false);

const handleNewWell = useCallback(() => {
  if (tier && wellCount >= tier.maxWells) {
    setShowLimitModal(true);
    return;
  }
  setCurrentStep('location');
}, [tier, wellCount]);

const handleLimitModalClose = useCallback(() => {
  setShowLimitModal(false);
}, []);
```

### Updated SubscriptionPage URL with tier param
```typescript
// In SubscriptionPage.tsx -- update the Manage Plan href
import { buildSubscriptionUrl } from '../lib/subscriptionUrls';

// Replace existing href construction:
const manageUrl = subscriptionUrl && farmId && tier
  ? buildSubscriptionUrl(subscriptionUrl, farmId, tier.slug)
  : null;
```

### AddUserModal Upgrade Link Addition
```typescript
// In the allSeatsFull block of AddUserModal.tsx, after the existing "Contact us" text:
{callerRole === 'grower' && subscriptionUrl && (
  <a
    href={buildSubscriptionUrl(subscriptionUrl, farmId, tier?.slug ?? '')}
    target="_blank"
    rel="noopener noreferrer"
    className="inline-flex items-center gap-1.5 text-sm text-[#bdefda] font-medium mt-2"
  >
    Upgrade Plan
    <ArrowTopRightOnSquareIcon className="h-4 w-4" />
  </a>
)}
```

### Settings Page "Manage Subscription" Link
```typescript
// In SettingsPage.tsx -- add a new section for growers
{canManageFarm && (
  <section className="mb-8">
    <h2 className="text-lg font-semibold text-white mb-4">Subscription</h2>
    <div className="bg-gray-800 rounded-lg border border-gray-700">
      <button
        onClick={() => navigate('/subscription')}
        className="w-full flex items-center gap-3 p-4 text-white hover:bg-gray-700/50 transition-colors text-left"
      >
        <CreditCardIcon className="h-5 w-5 text-gray-400" />
        <span>Manage Subscription</span>
        <ChevronRightIcon className="h-5 w-5 text-gray-400 ml-auto" />
      </button>
    </div>
  </section>
)}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Hardcoded `PLAN_LIMITS` in `subscription.ts` | DB-driven `useSubscriptionTier()` hook | Phase 18 (2026-02-22) | Tier limits now come from PowerSync-synced `subscription_tiers` table |
| Well count filtered by `status = 'active'` | All non-deleted wells (no status filter) | Phase 20 decision (CONTEXT.md) | Inactive/disabled wells count against limit; only hard-deleted wells are excluded |
| "Contact us to upgrade" static text | External subscription URL with farm context params | Phase 20 decision (CONTEXT.md) | Links open external site with `?farm_id=X&tier=slug` for future Stripe integration |

**Deprecated/outdated:**
- `PLAN_LIMITS` constant: Removed in Phase 18. All tier info now from `useSubscriptionTier()`.
- `subscription.ts` `PlanLimits` type: Still exists but unused for limit enforcement. Types `RoleSeatInfo`, `isSeatLimited()`, and `EXEMPT_ROLES` remain in use.

## Open Questions

1. **Does `manage_farm` map exclusively to grower + super_admin?**
   - What we know: Permission matrix shows `manage_farm` only in `super_admin` (ALL_ACTIONS) and `grower` (ALL_EXCEPT_CROSS_FARM). Admin and meter_checker do NOT have it.
   - What's unclear: Nothing -- this is confirmed by code review.
   - Recommendation: No action needed. The `/subscription` route guard via `RequireRole action="manage_farm"` correctly limits access to growers (and super_admins).

2. **Should WellListPage "New Well" also use the modal?**
   - What we know: WellListPage's "New Well" navigates to `/wells/new` (which doesn't exist as a standalone route -- it goes to DashboardPage). Actually, reviewing the code: `handleNewWell` navigates to `/wells/new`, but there is no route for `/wells/new` in App.tsx. The catch-all redirects to `/`.
   - What's unclear: Whether WellListPage's "New Well" should show the same modal inline, or redirect to dashboard.
   - Recommendation: Show the modal inline on WellListPage (same as DashboardPage). The button already has the `canCreateWell` guard. Change the handler to check limit and show modal.

## Sources

### Primary (HIGH confidence)
- **Codebase analysis** -- Direct reading of all relevant source files:
  - `src/hooks/useSubscriptionTier.ts` -- existing tier hook, returns `maxWells`
  - `src/hooks/useSeatUsage.ts` -- existing seat usage hook, already DB-driven
  - `src/hooks/useAppSetting.ts` -- existing app setting hook for subscription URL
  - `src/pages/SubscriptionPage.tsx` -- existing subscription page with display
  - `src/components/AddUserModal.tsx` -- existing invite modal with seat limits
  - `src/pages/DashboardPage.tsx` -- "New Well" button, location picker flow
  - `src/pages/WellListPage.tsx` -- "New Well" button, navigates to `/wells/new`
  - `src/pages/SettingsPage.tsx` -- settings page, needs subscription link
  - `src/components/ConfirmDeleteWellDialog.tsx` -- Dialog pattern reference
  - `src/lib/permissions.ts` -- permission matrix confirming manage_farm scope
  - `src/App.tsx` -- routing confirming subscription page guard
- `/tailwindlabs/headlessui` (Context7) -- Dialog component API confirmation

### Secondary (MEDIUM confidence)
- `.planning/phases/20-subscription-limits-page/20-CONTEXT.md` -- User decisions
- `.planning/STATE.md` -- Phase 18 decision history (well count filter override)
- `.planning/REQUIREMENTS.md` -- TIER-06, TIER-07, TIER-08 requirement definitions

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new libraries, all patterns exist in codebase
- Architecture: HIGH -- all hooks and components follow established patterns, only wiring needed
- Pitfalls: HIGH -- all identified from direct code analysis and user decisions

**Research date:** 2026-02-22
**Valid until:** 2026-03-22 (stable -- no external dependency changes expected)
