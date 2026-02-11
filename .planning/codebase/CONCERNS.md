# Codebase Concerns

**Analysis Date:** 2026-02-10

## Tech Debt

**Extensive localStorage/sessionStorage Usage Without Centralization:**
- Files: `src/components/MapView.tsx`, `src/hooks/useGeolocation.ts`
- Issue: Multiple hardcoded storage keys scattered throughout codebase with no centralized management
  - `BANNER_DISMISSED_KEY` in MapView
  - `LOCATION_CACHE_KEY` in useGeolocation
- Impact: Difficult to track what's persisted, hard to migrate storage strategy, inconsistent expiry/invalidation logic
- Fix approach: Create `src/lib/storage.ts` with typed storage API and centralized key constants

**Large Components with Mixed Concerns:**
- Files:
  - `src/components/AddWellFormBottomSheet.tsx` (371 lines)
  - `src/lib/AuthProvider.tsx` (296 lines)
  - `src/pages/onboarding/CreateFarmPage.tsx` (296 lines)
- Issue: Components handle multiple responsibilities: state management, validation, API calls, UI
- Impact: Difficult to test, understand, or reuse logic. Performance degradation from re-renders
- Fix approach: Extract form logic into custom hooks (`useAddWellForm`, `useCreateFarm`), separate validation logic into utilities

**Verbose Console Logging in Production Code:**
- Files: Multiple files (19 occurrences across 7 files)
- Issue: console.log/warn/error statements left throughout codebase without conditional logging
- Impact: Clutters browser console, leaks sensitive data (user IDs, operation details), difficult to disable in production
- Fix approach: Implement centralized logging utility with environment-based log levels

**Missing Error Boundaries:**
- Files: `src/components/AppLayout.tsx`, `src/App.tsx`
- Issue: No React Error Boundaries wrapping components that can throw (map rendering, PowerSync operations, API calls)
- Impact: Single component error crashes entire app, poor user experience, no graceful fallback
- Fix approach: Add Error Boundary component around high-risk areas (map, PowerSync provider, routes)

**Incomplete Type Safety in Error Handling:**
- Files: `src/components/AddUserModal.tsx` (line 95), `src/pages/onboarding/CreateFarmPage.tsx`
- Issue: Broad `unknown` error type casting with string matching on error messages (`msg.includes('already')`)
- Impact: Brittle error handling dependent on exact error message text from API, breaks with API changes
- Fix approach: Use typed error responses from API, create error type discriminator

## Known Bugs

**Map Long-Press Detection Not Working on Touch Devices:**
- Files: `src/components/MapView.tsx` (lines 53-70, 144-150)
- Symptoms: Long-press to create well doesn't register on iOS/Android despite timer setup
- Trigger: Press and hold on map for >500ms on mobile devices
- Root cause: Event handlers may not be properly attached to touch events on mapbox-gl container; timing refs could be cleared unexpectedly
- Current state: Code references `pressTimerRef` and move threshold but effectiveness untested on real devices
- Workaround: Use map click fallback to manually enter coordinates via location picker

**Geolocation Permission Banner Dismissal Persists Across Sessions:**
- Files: `src/components/MapView.tsx` (lines 51, 81-83, 88-91)
- Symptoms: User dismisses "Enable location" banner once, never sees it again even if they grant permission later
- Trigger: Dismiss banner → grant permission in OS settings → reload app
- Root cause: `sessionStorage` should be used but persistence key suggests persistent dismissal intent
- Impact: Users who initially deny permission won't be re-prompted to enable it
- Workaround: Clear browser storage to reset state

**GPS Loading State Never Clears on Permission Error:**
- Files: `src/components/AddWellFormBottomSheet.tsx` (lines 82-103)
- Symptoms: "Loading" spinner stays visible indefinitely if user denies geolocation permission
- Trigger: Click "Get Location" button → deny permission in browser prompt
- Root cause: Error callback sets `gpsLoading = false` correctly, but UI spinner animation may have CSS issues
- Impact: Button appears hung, unclear to user that they denied permission

## Security Considerations

**Unvalidated PowerSync Sync Rules Not Verified:**
- Issue: `docs/powersync-sync-rules.yaml` is documentation only; actual rules on PowerSync dashboard not validated against this file
- Files: `docs/powersync-sync-rules.yaml`, `src/lib/powersync-schema.ts`, `src/lib/powersync-connector.ts`
- Risk: Missing `role` column in farm_invites sync rule would expose all invites to all users; inadequate row-level filtering could leak data between farms
- Current mitigation: Sync rules documented; manual verification required on dashboard
- Recommendations:
  - Add automated test that validates PowerSync dashboard rules match schema
  - Document exact PowerSync configuration as code (if supported by PowerSync CLI)
  - Add RLS policy validation tests in Supabase

**No Rate Limiting on SMS Invites:**
- Files: `src/components/AddUserModal.tsx` (lines 68-92)
- Risk: Admin can spam unlimited SMS invites to any number, potential abuse of third-party SMS service
- Current mitigation: None (relies on backend/Twilio rate limits)
- Recommendations:
  - Add client-side rate limiting (e.g., max 10 invites per 5 minutes)
  - Track invite count per farm/admin in database
  - Add cooldown UI feedback

**SMS Delivery Failures Not Properly Handled:**
- Files: `src/components/AddUserModal.tsx` (lines 78-92)
- Risk: SMS fails silently with warning flag; user thinks invite sent but recipient never receives SMS. No retry mechanism
- Current mitigation: `smsWarning` flag shown but doesn't block success state
- Recommendations:
  - Require explicit SMS confirmation before marking invite as sent
  - Add retry button for failed SMS attempts
  - Store SMS delivery status in database (pending, sent, failed)

**Geolocation Data Cached in sessionStorage:**
- Files: `src/hooks/useGeolocation.ts` (lines 3-4, 62-69)
- Risk: User location cached in browser storage for 5 minutes; could be extracted by XSS or malicious scripts
- Current mitigation: sessionStorage (cleared on tab close) rather than localStorage
- Recommendations:
  - Evaluate if caching is necessary—location refreshes often anyway
  - If needed, reduce cache duration or encrypt
  - Consider memory-only cache instead of storage

## Performance Bottlenecks

**Inefficient Well Marker Re-Renders:**
- Files: `src/components/MapView.tsx` (lines 1-25), `src/components/WellMarker.tsx`
- Problem: Well markers list rendered on every map state change; no memoization on individual markers
- Cause: Wells array passed as prop without `useMemo`; WellMarker not wrapped in `React.memo`
- Impact: Noticeable lag when panning/zooming with 50+ wells visible
- Improvement path:
  - Wrap `WellMarker` in `React.memo` with stable props
  - Memoize wells array filtering in MapView with `useMemo`
  - Consider clustering for high-density well areas (>20 wells in view)

**PowerSync Connector Logs Every Upload Operation:**
- Files: `src/lib/powersync-connector.ts` (lines 104-106)
- Problem: `console.log` on every upsert/update/delete operation
- Impact: 100+ log lines per sync cycle; slows down browser console, increases memory usage, overwhelms debugging
- Improvement path: Replace with conditional logging (only on errors or if env flag set)

**No Batching of PowerSync Writes:**
- Files: `src/lib/powersync-connector.ts` (lines 57-75)
- Problem: CRUD operations applied one-at-a-time in a loop; no batch optimization
- Impact: Multiple Supabase calls for single transaction; latency adds up
- Improvement path: Check if PowerSync supports batch operations; group writes by operation type

**Geolocation Retry Causes Infinite Loops:**
- Files: `src/hooks/useGeolocation.ts` (lines 154-161), `src/components/MapView.tsx` (lines 122-127)
- Problem: MapView watches `retryGeolocation` callback in dependency array; callback changes when props change
- Impact: Unnecessary re-fetches if wrapper component re-renders
- Improvement path: Wrap retry in `useCallback` in MapView; review dependency array

**Large State Objects in AuthProvider:**
- Files: `src/lib/AuthProvider.tsx` (lines 50-54)
- Problem: Entire onboarding status object in context triggers re-renders of all consumers on any state change
- Impact: All pages re-render when user session refreshes even if only token updated
- Improvement path: Split context into smaller pieces (user context, onboarding context, auth context)

## Fragile Areas

**Onboarding Status Fetch Relies on RPC Function:**
- Files: `src/lib/AuthProvider.tsx` (lines 63-86)
- Why fragile:
  - RPC call `get_onboarding_status` must exist in Supabase and be maintained
  - Any changes to database schema break the RPC silently
  - No version control or migration strategy for RPC functions
- Safe modification:
  - Test RPC after schema changes
  - Add logging in RPC to detect stale responses
  - Consider replacing with direct SQL query if permissions allow

**Farm Invite Sync Rules Depend on Dashboard Configuration:**
- Files: `docs/powersync-sync-rules.yaml`, `src/components/PendingInvitesList.tsx`
- Why fragile:
  - `role` column may be missing from invite query per memory notes
  - Separate buckets for owner/admin roles means logic is duplicated
  - Dashboard configuration not version controlled; hard to audit
- Safe modification:
  - Verify `role` column exists in PowerSync dashboard farm_invites bucket
  - Create Supabase test to validate sync rules return expected columns
  - Document exact dashboard configuration as code comments

**Map Tile Loading Error Detection:**
- Files: `src/components/MapView.tsx` (lines 93-110)
- Why fragile:
  - Error detection based on string matching (`message.includes('tile')`)
  - Mapbox errors may change format in updates
  - No actual offline fallback implemented, just overlay message
- Safe modification:
  - Monitor Mapbox error format in v4 releases
  - Test error detection with actual network failures
  - Implement actual offline tile layer if that's a requirement

## Scaling Limits

**PowerSync Local Database Size Unbounded:**
- Files: `src/lib/powersync.ts`, `src/lib/powersync-connector.ts`
- Current capacity: SQLite database grows with sync data; no cleanup/pruning strategy
- Limit: Device storage exhaustion after >10,000 wells or high-frequency reading updates
- Scaling path:
  - Implement data archival (move old readings to backend-only)
  - Add read-limiting per farm (sync only last N months of readings)
  - Monitor database file size in app and alert user

**Map Rendering Performance:**
- Files: `src/components/MapView.tsx`
- Current capacity: Smooth performance with <50 wells visible
- Limit: Browser becomes sluggish with >200 wells; clustering not implemented
- Scaling path:
  - Implement Mapbox clustering layer for high-density areas
  - Virtual scrolling for well list view (WellListPage)
  - Lazy-load reading history (only fetch on demand)

**Supabase RPC Concurrency:**
- Files: `src/lib/AuthProvider.tsx`, `src/components/AddUserModal.tsx`, `src/pages/onboarding/CreateFarmPage.tsx`
- Current capacity: Single concurrent RPC calls per user
- Limit: If multiple pages fetch onboarding status simultaneously, could hit rate limits
- Scaling path:
  - Implement request deduplication/memoization
  - Add exponential backoff retry logic
  - Cache onboarding status with TTL

## Dependencies at Risk

**PowerSync v1.32.0 vs Latest:**
- Risk: Library is rapidly evolving; offline sync semantics may change in v2.x
- Impact: Major version upgrade could require significant refactoring of connector and schema
- Migration plan:
  - Pin to ^1.32.0 to allow patch updates
  - Set up monitoring for v2.0 release
  - Evaluate migration cost before upgrading

**@journeyapps/wa-sqlite - Web Worker Integration:**
- Risk: SQLite runs in worker thread; debugging is difficult, serialization overhead
- Impact: Workers may crash silently; shared state issues if accessed from main thread
- Migration plan:
  - Monitor for OPFS API improvements (coming in browsers)
  - Evaluate Durable Storage API as alternative
  - Test crash recovery scenarios

## Missing Critical Features

**No Data Export/Backup for User:**
- Problem: User has no way to export well data, readings, or farm configuration
- Blocks: Switching providers, data audit, compliance requirements
- Priority: Medium (regulatory/user trust)

**No Offline Indication During PowerSync Sync Failure:**
- Problem: App appears to work but data not uploading; user unaware of data loss risk
- Blocks: Users entering data thinking it's saved when it's not
- Priority: High (data integrity)
- Current: `SyncStatusBanner` component exists but may not cover all failure modes

**No Invite Code Expiration UI:**
- Problem: Admins can't see which invites are expired; expired invites listed indefinitely
- Blocks: Cleaning up stale invites, preventing reuse of old codes
- Priority: Low (workaround: manual review)

## Test Coverage Gaps

**Geolocation Hook Not Tested:**
- What's not tested:
  - StrictMode double-mount handling (core feature)
  - Request ID invalidation logic
  - Cache validation and expiry
  - Permission state transitions
- Files: `src/hooks/useGeolocation.ts`
- Risk: Behavior changes silently; double-fetch bugs reappear without detection
- Priority: High

**PowerSync Connector Error Handling Not Tested:**
- What's not tested:
  - Permanent vs retryable error classification
  - Transaction completion on permanent errors
  - Boolean normalization for wells
  - Constraint violation handling
- Files: `src/lib/powersync-connector.ts`
- Risk: Data corruption or loss if error logic fails; silent failures on RLS violations
- Priority: High

**Auth State Machine Not Tested:**
- What's not tested:
  - INITIAL_SESSION vs SIGNED_IN race conditions
  - isVerifyingRef flag prevents duplicate state updates
  - Token refresh side effects
  - Offline token expiration recovery
- Files: `src/lib/AuthProvider.tsx`
- Risk: Auth state inconsistencies cause cascading failures in app logic
- Priority: High

**Form Validation Not Tested:**
- What's not tested:
  - AddWellForm validation edge cases (NaN, out-of-range coords)
  - CreateFarmForm address normalization
  - Phone number parsing/validation
- Files: `src/components/AddWellFormBottomSheet.tsx`, `src/pages/onboarding/CreateFarmPage.tsx`
- Risk: Invalid data persisted to database; GPS coordinates misformatted
- Priority: Medium

**Map Interactions Not Tested:**
- What's not tested:
  - Long-press detection on touch
  - Tile error recovery
  - User location animation/fly-to
  - Permission state changes during map lifetime
- Files: `src/components/MapView.tsx`
- Risk: Core feature (location picking) broken undetected; silent failures on permission errors
- Priority: High

---

*Concerns audit: 2026-02-10*
