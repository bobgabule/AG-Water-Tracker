# Phase 18: Tier Sync & Hooks - Research

**Researched:** 2026-02-22
**Domain:** PowerSync global bucket sync + React hooks for subscription tier data
**Confidence:** HIGH

## Summary

Phase 18 completes the subscription tier integration started in Phase 17. The database foundation (tables, RLS, seed data) already exists. The PowerSync schema definitions (`subscription_tiers`, `app_settings` in `powersync-schema.ts`) and the core hooks (`useSubscriptionTier()`, `useSeatUsage()`) already exist and are functional. The sync rules YAML documentation for global buckets (`subscription_tiers_global`, `app_settings_global`) is already written.

The remaining work is: (1) deploy the sync rules to the PowerSync dashboard (manual step), (2) create a `useAppSetting()` hook for reading app settings, (3) add well count display and "Manage Plan" button to the Subscription page, (4) remove the now-dead `PLAN_LIMITS` constant (already removed -- `subscription.ts` no longer contains it), and (5) wire the loading states per the user's decisions.

**Primary recommendation:** This phase is mostly UI wiring and a manual dashboard deployment. The hooks and schema are already in place from Phase 17 groundwork. Focus on the `useAppSetting()` hook, Subscription page enhancements (well count + manage plan button), and the sync rule deployment checkpoint.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Show inline loading state (skeleton) until tier data syncs -- block limit-dependent actions
- Each component that needs tier data shows its own skeleton/spinner; rest of app works normally
- Disable invite button while tier data is loading (show "Loading plan limits..." message)
- Consistent pattern for ALL tier-limit-dependent actions: disabled with loading message until tier data available (applies to future features like "New Well" in Phase 20)
- Any place displaying tier-derived numbers (seat counts, well limits) shows skeleton until data loads
- Trust cached data when offline -- no stale indicator needed; PowerSync auto-updates on reconnect
- "Manage Plan" button appears on the Subscription page only (not inline elsewhere)
- Opens the external subscription website in the device's default browser (not in-app)
- Visible to growers only (admins and meter checkers cannot see the link)
- Subscription page access remains gated behind `manage_farm` permission (growers only)
- Button is hidden when `subscription_website_url` is not set in app_settings (no broken links)
- URL has farm_id appended as query parameter (e.g., `?farm_id=xxx`)
- External link icon shown next to button text to indicate it leaves the app
- URL left empty for now -- plumbing set up, URL inserted into DB later when subscription site is ready
- Show well count vs limit (e.g., "3 / 10 Wells") alongside existing seat usage display
- Match the "Full" badge pattern from seats -- red "Full" badge when farm is at well limit
- Only `subscription_website_url` for now; more settings added via DB insert later without code deploys
- All values treated as strings; consuming code handles parsing if needed
- Read-only from client -- app can only READ settings, changes made via direct DB access

### Claude's Discretion
- Hook API design: whether `useSubscriptionTier()` adds an explicit `isLoading` flag or keeps the `null` return convention
- Hook design for app_settings: generic `useAppSetting(key)` vs specific hooks per setting
- Default value support in app_settings hook
- Never-synced edge case handling (timeout vs persistent skeleton)
- "Manage Plan" button text and visual style
- Connector guard layer (whether to add explicit read-only guards beyond existing ALLOWED_TABLES)
- Sync rules deployment approach (manual dashboard step vs scripted)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| TIER-04 | PowerSync global bucket sync for subscription_tiers and app_settings (available offline) | Sync rules YAML already documented; PowerSync schema already has both tables defined; global bucket pattern confirmed via Context7. Deployment to PowerSync dashboard is the remaining step. |
| TIER-05 | `useSubscriptionTier()` hook replacing hardcoded `PLAN_LIMITS` in `src/lib/subscription.ts` | Hook already exists and is functional (`src/hooks/useSubscriptionTier.ts`). `PLAN_LIMITS` constant was already removed from `subscription.ts` during Phase 17 groundwork. Remaining work: loading state handling, `useAppSetting()` hook creation, and Subscription page UI enhancements. |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @powersync/react | (existing) | `useQuery` hook for reactive SQLite queries | Already used throughout the app for all data access |
| @powersync/web | (existing) | `Schema`, `TableV2`, `column` for schema definition | Already defines all tables including `subscription_tiers` and `app_settings` |
| @heroicons/react | (existing) | `ArrowTopRightOnSquareIcon` for external link indicator | Already used throughout app; `24/outline` variant matches existing patterns |
| react | 19 | `useMemo`, `useCallback` for memoization | Standard hook patterns per CLAUDE.md |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @headlessui/react | v2 (existing) | Dialog, transitions | Not needed for this phase (no modals) |

### Alternatives Considered
None -- this phase uses exclusively existing stack. No new dependencies needed.

**Installation:**
```bash
# No new packages needed -- all libraries already installed
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── hooks/
│   ├── useSubscriptionTier.ts  # EXISTS - farm's tier limits from PowerSync
│   ├── useSeatUsage.ts         # EXISTS - seat usage counts + limits
│   └── useAppSetting.ts        # NEW - generic app_settings key lookup
├── lib/
│   ├── subscription.ts         # EXISTS - types and helpers (PLAN_LIMITS already removed)
│   └── powersync-schema.ts     # EXISTS - subscription_tiers + app_settings tables defined
├── pages/
│   └── SubscriptionPage.tsx    # MODIFY - add well count, manage plan button, loading states
└── components/
    └── AddUserModal.tsx        # MODIFY - add loading state when tier data is null
```

### Pattern 1: Generic App Settings Hook
**What:** A `useAppSetting(key)` hook that queries the `app_settings` table by key and returns the value string (or null/default).
**When to use:** Any time a component needs a global config value from `app_settings`.
**Example:**
```typescript
// src/hooks/useAppSetting.ts
import { useMemo } from 'react';
import { useQuery } from '@powersync/react';

interface AppSettingRow {
  id: string;   // key mapped to id via sync rules
  value: string;
}

/**
 * Returns a single app setting value by key.
 * Returns `defaultValue` (default: null) when the key is not found or not yet synced.
 */
export function useAppSetting(key: string, defaultValue: string | null = null): string | null {
  const { data } = useQuery<AppSettingRow>(
    `SELECT id, value FROM app_settings WHERE id = ?`,
    [key]
  );

  return useMemo(
    () => (data.length > 0 ? data[0].value : defaultValue),
    [data, defaultValue]
  );
}
```

### Pattern 2: Well Count Query for Subscription Page
**What:** Count wells for the current farm from PowerSync SQLite.
**When to use:** Subscription page well usage display.
**Example:**
```typescript
// Inline in SubscriptionPage or as a small hook
const farmId = onboardingStatus?.farmId ?? null;

const wellCountQuery = farmId
  ? `SELECT COUNT(*) as count FROM wells WHERE farm_id = ?`
  : 'SELECT NULL WHERE 0';

const { data: wellCountData } = useQuery<{ count: number }>(
  wellCountQuery,
  farmId ? [farmId] : []
);

const wellCount = useMemo(
  () => wellCountData?.[0]?.count ?? 0,
  [wellCountData]
);
```

### Pattern 3: Skeleton Loading State
**What:** Inline skeleton placeholders shown while tier data is `null`.
**When to use:** Any component displaying tier-derived numbers.
**Example:**
```tsx
{/* Skeleton while loading */}
{!tier && (
  <div className="animate-pulse">
    <div className="h-4 bg-[#c5cdb4] rounded w-24 mb-2" />
    <div className="h-3 bg-[#c5cdb4] rounded w-full mb-1" />
  </div>
)}

{/* Real data */}
{tier && (
  <div>
    <span>{wellCount} / {tier.maxWells} Wells</span>
    {wellCount >= tier.maxWells && (
      <span className="ml-1.5 text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">Full</span>
    )}
  </div>
)}
```

### Pattern 4: External Link Button with Farm ID
**What:** "Manage Plan" button that opens external URL with `?farm_id=` parameter.
**When to use:** Subscription page only, visible to growers only.
**Example:**
```tsx
import { ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';

const subscriptionUrl = useAppSetting('subscription_website_url');
const farmId = onboardingStatus?.farmId;

// Only render when URL is set (not empty/placeholder)
{subscriptionUrl && subscriptionUrl !== '' && (
  <a
    href={`${subscriptionUrl}?farm_id=${farmId}`}
    target="_blank"
    rel="noopener noreferrer"
    className="inline-flex items-center gap-2 ..."
  >
    Manage Plan
    <ArrowTopRightOnSquareIcon className="h-4 w-4" />
  </a>
)}
```

### Anti-Patterns to Avoid
- **Writing to read-only tables locally:** Never execute INSERT/UPDATE/DELETE on `subscription_tiers` or `app_settings` via PowerSync. These are server-managed. The ALLOWED_TABLES set in the connector already excludes them -- no changes needed.
- **Fetching tier data per-component:** Don't duplicate `useSubscriptionTier()` queries. Call the hook once per component tree level and pass data down, or call it in each leaf (hooks are cheap since PowerSync deduplicates reactive queries).
- **Hardcoding tier limits anywhere:** The entire point of this phase is to replace hardcoded values with DB-driven hooks. Never add new constants for seat or well limits.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Reactive SQLite queries | Custom polling/subscription | `useQuery` from `@powersync/react` | Automatic reactivity, deduplication, proper cleanup |
| Offline data persistence | IndexedDB/localStorage wrapper | PowerSync sync engine | Already handles offline SQLite, sync queue, conflict resolution |
| External link handling | Custom window.open wrapper | Native `<a href target="_blank">` | Standard browser behavior, works on all devices including PWA |

**Key insight:** The entire offline sync infrastructure is already in place. This phase is about wiring existing plumbing, not building new infrastructure.

## Common Pitfalls

### Pitfall 1: Sync Rules Not Deployed
**What goes wrong:** Schema is defined in PowerSync client but sync rules aren't deployed to the PowerSync dashboard, so `subscription_tiers` and `app_settings` tables remain empty locally.
**Why it happens:** The sync rules YAML file (`docs/powersync-sync-rules.yaml`) is documentation only -- it must be manually configured in the PowerSync dashboard.
**How to avoid:** Include a human-verify checkpoint task for deploying sync rules to the dashboard and confirming data appears.
**Warning signs:** `useSubscriptionTier()` always returns `null` even when online; tables empty in PowerSync debug tools.

### Pitfall 2: Placeholder URL Treated as Valid
**What goes wrong:** "Manage Plan" button renders with `https://example.com/subscribe` placeholder URL, leading users to a non-existent page.
**Why it happens:** The migration seeds a placeholder URL. Button visibility check only checks for non-null, not for placeholder values.
**How to avoid:** The user decision says "URL left empty for now." Either: (a) update the DB to set the value to empty string, or (b) check for empty/placeholder in the hook. Recommendation: update the seed data to an empty string value, then hide the button when the value is empty string.
**Warning signs:** Button renders on Subscription page before subscription website exists.

### Pitfall 3: `app_settings` Key Mismatch
**What goes wrong:** Hook queries `WHERE id = 'subscription_website_url'` but PowerSync maps `key AS id` in sync rules. If sync rules aren't deployed, the mapping doesn't exist.
**Why it happens:** The `app_settings` table uses `key` as PK in Supabase, mapped to `id` in PowerSync via `SELECT key AS id`.
**How to avoid:** Always query by `id` column (not `key`) in client-side SQL. This is the correct pattern and matches how `subscription_tiers` uses `slug AS id`.
**Warning signs:** Query returns empty results despite sync rules being deployed.

### Pitfall 4: Well Count Includes Inactive Wells
**What goes wrong:** Well count shows total including deleted/inactive wells, overstating usage.
**Why it happens:** `COUNT(*)` without status filter counts all wells.
**How to avoid:** Filter by `status = 'active'` in the well count query (matches the `useWells` hook pattern which returns all wells but the count for limit comparison should only count active ones).
**Warning signs:** Well count exceeds limit even though user sees fewer wells in the list.

### Pitfall 5: Loading State Flicker on Navigation
**What goes wrong:** Skeleton shows briefly on every page navigation even when data is already cached.
**Why it happens:** `useQuery` returns empty data array for one render cycle before reactive results populate.
**How to avoid:** PowerSync's local SQLite cache means data is available nearly instantly after first sync. The skeleton will only show on truly first-ever load (before any sync). This is acceptable per user's decision to "trust cached data when offline." No special handling needed.
**Warning signs:** Persistent skeleton on every navigation -- indicates sync rules not deployed.

## Code Examples

Verified patterns from the existing codebase:

### Existing useSubscriptionTier Hook (already implemented)
```typescript
// Source: src/hooks/useSubscriptionTier.ts (existing)
// Returns SubscriptionTierInfo | null
// Two-step query: farm → subscription_tier slug → tier row
// Returns null while loading or if no farm
export function useSubscriptionTier(): SubscriptionTierInfo | null { ... }
```

### Existing useSeatUsage Hook (already implemented)
```typescript
// Source: src/hooks/useSeatUsage.ts (existing)
// Returns SeatUsage with admin and meter_checker RoleSeatUsage
// Combines member counts + pending invite counts vs tier limits
export function useSeatUsage(): SeatUsage { ... }
```

### Existing PowerSync Schema (already has both tables)
```typescript
// Source: src/lib/powersync-schema.ts (existing)
const subscription_tiers = new TableV2({
  display_name: column.text,
  max_admins: column.integer,
  max_meter_checkers: column.integer,
  max_wells: column.integer,
  sort_order: column.integer,
  created_at: column.text,
  updated_at: column.text,
});

const app_settings = new TableV2({
  value: column.text,
  created_at: column.text,
  updated_at: column.text,
});
```

### Existing Sync Rules (documentation, needs dashboard deployment)
```yaml
# Source: docs/powersync-sync-rules.yaml (existing documentation)
subscription_tiers_global:
  parameters: SELECT 'global' as scope
  data:
    - SELECT slug AS id, display_name, max_admins, max_meter_checkers, max_wells, sort_order, created_at, updated_at FROM subscription_tiers WHERE 'global' = bucket.scope

app_settings_global:
  parameters: SELECT 'global' as scope
  data:
    - SELECT key AS id, value, created_at, updated_at FROM app_settings WHERE 'global' = bucket.scope
```

### Existing Skeleton Pattern (already on Subscription page)
```tsx
// Source: src/pages/SubscriptionPage.tsx (existing)
{!tier && (
  <div className="bg-[#dfe4d4] rounded-lg p-3 mb-4 animate-pulse">
    <div className="h-4 bg-[#c5cdb4] rounded w-24 mb-2" />
    <div className="h-3 bg-[#c5cdb4] rounded w-full mb-1" />
    <div className="h-3 bg-[#c5cdb4] rounded w-full" />
  </div>
)}
```

### Existing "Full" Badge Pattern (already on Subscription page)
```tsx
// Source: src/pages/SubscriptionPage.tsx (existing)
{seatUsage.admin.isFull && (
  <span className="ml-1.5 text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">Full</span>
)}
```

### Connector ALLOWED_TABLES (read-only protection already in place)
```typescript
// Source: src/lib/powersync-connector.ts (existing)
const ALLOWED_TABLES = new Set(['farms', 'users', 'farm_members', 'farm_invites', 'wells', 'readings', 'allocations']);
// subscription_tiers and app_settings are NOT in this set
// Any accidental writes to them will be silently dropped with a debug error log
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Hardcoded `PLAN_LIMITS` in `subscription.ts` | DB-driven `useSubscriptionTier()` hook | Phase 17 (2026-02-22) | `PLAN_LIMITS` already removed; hook exists but needs sync rules deployed |
| No app settings table | `app_settings` key-value table in Supabase + PowerSync | Phase 17 (2026-02-22) | Tables exist; need sync rules + client hook |

**Deprecated/outdated:**
- `PLAN_LIMITS` constant: Already removed from `subscription.ts`. No code references it. Phase complete on this front.

## Discretion Recommendations

### 1. useSubscriptionTier API: Keep `null` return convention
**Recommendation:** Keep the existing `SubscriptionTierInfo | null` return type. Adding an explicit `isLoading` flag would require changing the hook signature and all consumers. The `null` convention is already understood by `SubscriptionPage` and `AddUserModal`.
**Confidence:** HIGH -- this is a trivial API choice and the existing pattern works well.

### 2. App Settings Hook: Generic `useAppSetting(key, defaultValue?)`
**Recommendation:** Generic hook with optional default value. Creating specific hooks per setting would be over-engineering for 1-2 settings currently. The generic pattern is extensible without code changes when new settings are added via DB.
**Confidence:** HIGH -- standard pattern for key-value config access.

### 3. Never-synced Edge Case: Persistent skeleton (no timeout)
**Recommendation:** Show skeleton indefinitely until data syncs. PowerSync will sync within seconds when online. If permanently offline with no cache, the user simply sees a skeleton -- this is acceptable because the rest of the app works normally (per user's decision). Adding a timeout would require defining fallback behavior which isn't needed.
**Confidence:** HIGH -- matches user's "trust cached data" decision.

### 4. "Manage Plan" Button: Simple text button with external link icon
**Recommendation:** Use a standard `<a>` tag styled as a button, matching the existing green/olive color scheme. Text: "Manage Plan". Icon: `ArrowTopRightOnSquareIcon` from `@heroicons/react/24/outline` at `h-4 w-4`.
**Confidence:** HIGH -- standard web pattern for external links.

### 5. Connector Guards: No additional guards needed
**Recommendation:** The existing `ALLOWED_TABLES` set in `powersync-connector.ts` already excludes `subscription_tiers` and `app_settings`. Any accidental local writes would be silently dropped with a debug error. No additional guards needed.
**Confidence:** HIGH -- verified by reading the connector code.

### 6. Sync Rules Deployment: Manual dashboard step with human-verify checkpoint
**Recommendation:** Manual deployment via PowerSync dashboard. Include a human-verify task in the plan with clear copy-paste instructions referencing `docs/powersync-sync-rules.yaml`.
**Confidence:** HIGH -- matches existing pattern from prior phases.

## Open Questions

1. **Placeholder URL in app_settings seed data**
   - What we know: Migration 033 seeds `subscription_website_url` with `'https://example.com/subscribe'`
   - What's unclear: User decision says "URL left empty for now" -- does the existing placeholder need to be updated to empty string?
   - Recommendation: Create a migration or manual DB update to set the value to empty string. The "Manage Plan" button visibility check should test for non-empty string (`value !== ''`), not just non-null. This avoids showing a button that links to a placeholder domain.

2. **Well status filter for count**
   - What we know: Wells have a `status` column (values include 'active')
   - What's unclear: Whether inactive/decommissioned wells should count toward the limit
   - Recommendation: Count only `status = 'active'` wells. This matches the most intuitive interpretation (you shouldn't be penalized for decommissioned wells). Can be adjusted later if business logic differs.

## Sources

### Primary (HIGH confidence)
- `/powersync-ja/powersync-docs` (Context7) -- global bucket sync rules, useQuery hooks, React patterns
- Existing codebase files (direct reading):
  - `src/hooks/useSubscriptionTier.ts` -- existing hook implementation
  - `src/hooks/useSeatUsage.ts` -- existing seat usage hook
  - `src/lib/powersync-schema.ts` -- existing schema with subscription_tiers + app_settings
  - `src/lib/powersync-connector.ts` -- ALLOWED_TABLES excludes config tables
  - `src/pages/SubscriptionPage.tsx` -- existing page with skeleton + seat usage
  - `docs/powersync-sync-rules.yaml` -- sync rules documentation
  - `supabase/migrations/033_subscription_tier_tables.sql` -- DB schema + seed data

### Secondary (MEDIUM confidence)
- None needed -- all research supported by primary sources

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new dependencies, everything already installed and in use
- Architecture: HIGH -- patterns are extensions of existing codebase patterns (hooks, queries, components)
- Pitfalls: HIGH -- identified from direct codebase analysis and known project history (MEMORY.md)

**Research date:** 2026-02-22
**Valid until:** 2026-04-22 (90 days -- stable domain, no moving targets)
