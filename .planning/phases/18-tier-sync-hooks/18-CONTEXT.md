# Phase 18: Tier Sync & Hooks - Context

**Gathered:** 2026-02-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Make subscription tier data available offline via PowerSync global bucket sync and expose it through reactive hooks that replace hardcoded constants. The `useSubscriptionTier()` and `useSeatUsage()` hooks already exist from Phase 17 groundwork. This phase completes the integration: deploying sync rules, creating an `app_settings` hook, wiring up the subscription website URL on the Subscription page, and adding well count display.

</domain>

<decisions>
## Implementation Decisions

### Offline Fallback Behavior
- Show inline loading state (skeleton) until tier data syncs — block limit-dependent actions
- Each component that needs tier data shows its own skeleton/spinner; rest of app works normally
- Disable invite button while tier data is loading (show "Loading plan limits..." message)
- Consistent pattern for ALL tier-limit-dependent actions: disabled with loading message until tier data available (applies to future features like "New Well" in Phase 20)
- Any place displaying tier-derived numbers (seat counts, well limits) shows skeleton until data loads
- Trust cached data when offline — no stale indicator needed; PowerSync auto-updates on reconnect

### Subscription Link
- "Manage Plan" button appears on the Subscription page only (not inline elsewhere)
- Opens the external subscription website in the device's default browser (not in-app)
- Visible to growers only (admins and meter checkers cannot see the link)
- Subscription page access remains gated behind `manage_farm` permission (growers only)
- Button is hidden when `subscription_website_url` is not set in app_settings (no broken links)
- URL has farm_id appended as query parameter (e.g., `?farm_id=xxx`)
- External link icon shown next to button text to indicate it leaves the app
- URL left empty for now — plumbing set up, URL inserted into DB later when subscription site is ready

### Subscription Page Enhancements
- Show well count vs limit (e.g., "3 / 10 Wells") alongside existing seat usage display
- Match the "Full" badge pattern from seats — red "Full" badge when farm is at well limit

### App Settings Access
- Only `subscription_website_url` for now; more settings added via DB insert later without code deploys
- All values treated as strings; consuming code handles parsing if needed
- Read-only from client — app can only READ settings, changes made via direct DB access

### Claude's Discretion
- Hook API design: whether `useSubscriptionTier()` adds an explicit `isLoading` flag or keeps the `null` return convention
- Hook design for app_settings: generic `useAppSetting(key)` vs specific hooks per setting
- Default value support in app_settings hook
- Never-synced edge case handling (timeout vs persistent skeleton)
- "Manage Plan" button text and visual style
- Connector guard layer (whether to add explicit read-only guards beyond existing ALLOWED_TABLES)
- Sync rules deployment approach (manual dashboard step vs scripted)

</decisions>

<specifics>
## Specific Ideas

- Well count display should match the exact visual pattern of seat usage rows (same layout, same "Full" badge style)
- External link icon for the "Manage Plan" button (Heroicons `ArrowTopRightOnSquareIcon` or similar)
- Farm ID appended to subscription URL as `?farm_id=<id>` query parameter

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 18-tier-sync-hooks*
*Context gathered: 2026-02-22*
