# Phase 20: Subscription Limits & Page - Context

**Gathered:** 2026-02-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Enforce well count and seat limits from DB-driven tier config, and display subscription usage on a dedicated page. The subscription page, useSubscriptionTier hook, useSeatUsage hook, and seat enforcement on the invite form already exist. The main gap is well limit enforcement and minor upgrades to existing UX.

</domain>

<decisions>
## Implementation Decisions

### Well Limit Feedback
- "New Well" button stays tappable at capacity — tapping it shows a limit modal
- Modal appears in BOTH locations: DashboardPage map and WellListPage
- Limit check happens at button tap (before location picker flow starts)
- Only growers/admins see the "New Well" button (existing behavior) — modal follows same gating
- Well count = all non-deleted wells (includes inactive/disabled, excludes deleted)
- Instant revert when well is deleted (count drops below limit, button works again)
- Offline: client-side enforcement using local PowerSync data; allow creation if tier data hasn't loaded yet (rare edge case — server-side enforcement deferred to TIER-D1)

### Limit Modal Design
- Simple: text + button, no icon or illustration
- Friendly + helpful tone: Title "Well Limit Reached", message "You've reached your well limit. Upgrade your plan for more wells."
- "Upgrade Plan" button (primary) opens external subscription website URL
- Close via X button or tap outside — no separate dismiss button
- For growers: shows "Upgrade Plan" button linking to external site
- For admins: generic "Well limit reached" with dismiss only (no upgrade CTA)
- If subscription_website_url not configured: show disabled "Upgrade Plan" button

### External Subscription URL
- All "Upgrade Plan" / "Manage Plan" links append query params: ?farm_id=X&tier=starter
- Consistent across: well limit modal, seat limit area, subscription page "Manage Plan" button
- Opens in system browser (standard PWA behavior)

### Seat Limit Upgrades
- Keep existing AddUserModal behavior (disabled roles + "All seats filled" message)
- ADD: "Upgrade Plan" link alongside "All seats are filled" message — opens external URL
- Same external URL pattern with farm_id + tier params
- Upgrade link visible to growers only

### Upgrade Path Placement
- Contextual: limit modals (well + seat) show upgrade when limits hit
- Persistent: add "Manage Subscription" link on Settings page (growers only)
- No "approaching limit" warnings — only at capacity
- Upgrade links visible to growers only everywhere

### Subscription Page
- Existing page is good as-is (tier name, seat usage, well count, "Manage Plan" button)
- Update well count query to match enforcement logic: all non-deleted wells (currently only active)
- "Manage Plan" button passes ?farm_id=X&tier=slug (currently just opens base URL)
- Access restricted to growers only (currently gated by manage_farm permission — verify this maps to growers only)

### Claude's Discretion
- Exact modal component implementation (reuse existing dialog patterns)
- Well count query optimization
- Settings page link placement and styling
- Error state handling for missing tier data

</decisions>

<specifics>
## Specific Ideas

- Well limit modal should feel lightweight — just text and a button, not a heavy dialog
- External subscription URL should include farm context (farm_id + tier) for future Stripe integration
- Seat limit and well limit messaging should feel consistent in tone

</specifics>

<deferred>
## Deferred Ideas

- Server-side well limit enforcement (TIER-D1) — future release
- Stripe Customer Portal integration (AUTH-D1) — future milestone
- "Approaching limit" warnings — decided against for now, could revisit

</deferred>

---

*Phase: 20-subscription-limits-page*
*Context gathered: 2026-02-22*
