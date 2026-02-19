# Roadmap: AG Water Tracker

## Overview

**v1.0** (Complete): Role-based user management and phone-based invite flows. 8 phases, 25 plans, 28 requirements -- all delivered.

**v1.1** (Complete): Dashboard and map view improvements. Smarter map default center using farm state, soft-ask location permission flow, long-press removal, and code quality fixes across all dashboard/map components. 3 phases, 3 plans, 17 requirements -- all delivered.

**v2.0** (Active): Meter readings and allocation tracking. Well detail page, reading recording with GPS proximity, allocation management, well editing, and problem reporting. The core data-capture features that make the app useful for field agents. 5 phases, 31 requirements.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

<details>
<summary>v1.0 (Phases 1-8) -- Complete</summary>

- [x] **Phase 1: Session Stability** - Fix loading spinner hang, blank page on reload, and add error boundaries
- [x] **Phase 2: Offline Session Resilience** - Offline-first session trust, token refresh failure handling, and offline registration messaging
- [x] **Phase 3: Role Foundation** - Database schema for 4-role system, RLS policies, and PowerSync sync rules
- [x] **Phase 4: Permission Enforcement** - Client-side route guards, UI gating by role, and super admin cross-farm access
- [x] **Phase 5: Grower Onboarding** - Complete grower registration flow and unknown phone number handling
- [x] **Phase 6: Invite System** - Invite form, farm_invites backend, SMS delivery, and invited user auto-onboarding
- [x] **Phase 7: User Management** - Users page, disable/enable users, profile editing, and disabled user filtering
- [x] **Phase 8: Subscription Gating** - Seat limit display, invite blocking at capacity, and upgrade placeholder

</details>

<details>
<summary>v1.1 -- Dashboard & Map (Phases 9-11) -- Complete</summary>

- [x] **Phase 9: Map Default View** - Smart farm-state center, remove long-press, keep wells center and GPS fly-to
- [x] **Phase 10: Location Permission Flow** - Soft-ask pattern with FAB button, custom modal, remove auto-request on load
- [x] **Phase 11: Dashboard Quality Fixes** - Geolocation guards, validation consistency, tile cache, accessibility, form fixes

</details>

### v2.0 -- Meter Readings & Allocations

- [x] **Phase 12: Data Foundation** - Supabase migration for readings + allocations tables, PowerSync schema, connector updates, query hooks, GPS proximity utility (completed 2026-02-19)
- [ ] **Phase 13: Well Detail Page** - Full-page slide-up sheet with well info header, usage gauge, status indicators, readings history, and empty states
- [ ] **Phase 14: Record Meter Reading** - New reading form with GPS auto-capture, similar reading warning, meter problem reporting, and proximity flagging
- [ ] **Phase 15: Well Editing & Allocation Management** - Well edit form, allocation CRUD (create/view/edit/delete), usage auto-calculation, and manual override
- [ ] **Phase 16: Reading Management & Map Integration** - Reading edit/delete for grower/admin, real allocation percentage on map markers, and reading dates on well list

## Phase Details

<details>
<summary>v1.0 Phase Details (Complete)</summary>

### Phase 1: Session Stability
**Goal**: App never hangs on a loading spinner or shows a blank white page after reload
**Depends on**: Nothing (first phase)
**Requirements**: AUTH-01, AUTH-02, AUTH-03
**Success Criteria** (what must be TRUE):
  1. User reloads the app and sees either the dashboard or a login screen within 3 seconds -- never an infinite spinner
  2. User refreshes the dashboard page and it renders correctly with their wells and map visible
  3. When a component crashes (map error, PowerSync failure), user sees a "Something went wrong" recovery screen with a retry button instead of a blank white page
**Plans**: 5 plans

Plans:
- [x] 01-01-PLAN.md -- Session recovery with 5s timeout on RPC + loading state cleanup (spinner-only, slow-load detection)
- [x] 01-02-PLAN.md -- Error boundaries (route-level + MapView-specific) with friendly retry UI
- [x] 01-03-PLAN.md -- Security hardening (SECURITY DEFINER to private schema) + console.log cleanup (debugLog utility)
- [x] 01-04-PLAN.md -- Gap closure: fix auth loading flash (isFetchingOnboarding flag) + scope ErrorBoundary to Outlet only
- [x] 01-05-PLAN.md -- Gap closure: add retry mechanism to PowerSync database initialization failure

### Phase 2: Offline Session Resilience
**Goal**: Logged-in users can use the app reliably in areas with no connectivity
**Depends on**: Phase 1
**Requirements**: AUTH-04, AUTH-05, AUTH-06
**Success Criteria** (what must be TRUE):
  1. User who previously logged in can open the app offline and see their dashboard with cached wells and map data
  2. User whose account has been revoked sees a clear "Your session has expired, please log in again" message when connectivity returns and token refresh fails
  3. User attempting to register (OTP) while offline sees a "No internet connection -- connect to sign in" message instead of a cryptic error
**Plans**: 3 plans

Plans:
- [x] 02-01-PLAN.md -- Onboarding status caching with offline fallback + connector error semantics fix
- [x] 02-02-PLAN.md -- Session expired UI for forced sign-outs + offline registration guards
- [x] 02-03-PLAN.md -- Gap closure: detect auth RPC errors in fetchOnboardingStatus and trigger immediate session expiry

### Phase 3: Role Foundation
**Goal**: The database correctly stores and enforces the 4-role system across all data access layers
**Depends on**: Phase 1
**Requirements**: ROLE-01, ROLE-02, ROLE-03
**Success Criteria** (what must be TRUE):
  1. farm_members table stores one of four roles (super_admin, grower, admin, meter_checker) per user and rejects any other value
  2. Supabase RLS policies block a user from querying or modifying another farm's data (wells, members, invites) even via direct API call
  3. PowerSync syncs only the current user's farm data to their device -- a user on Farm A never sees Farm B's wells or members in their local database
  4. A centralized TypeScript permission matrix defines which roles can perform which actions, and all client code references it
**Plans**: 4 plans

Plans:
- [x] 03-01-PLAN.md -- Permission matrix TypeScript module (Role, Action, hasPermission) and useUserRole hook
- [x] 03-02-PLAN.md -- Database migration: role rename (owner->grower, member->meter_checker), CHECK constraints, helper function updates
- [x] 03-03-PLAN.md -- Client code role references update (SettingsPage, AddUserModal) and PowerSync sync rules documentation
- [x] 03-04-PLAN.md -- Custom Access Token Hook (JWT claims injection) with dashboard enablement checkpoint

### Phase 4: Permission Enforcement
**Goal**: Users only see and can interact with features their role permits
**Depends on**: Phase 3
**Requirements**: ROLE-04, ROLE-05, ROLE-06, ROLE-07
**Success Criteria** (what must be TRUE):
  1. Meter checker cannot see the Users page, Settings sections for farm management, or the "Invite User" button
  2. Grower and admin can see and access all management features (users, wells, farm settings) within their own farm
  3. Super admin can navigate to any farm and see its wells, members, and settings
  4. Unauthorized route access (e.g., meter_checker navigating to /users via URL) redirects to dashboard with no error
  5. When a user's role changes on the server (e.g., downgrade from admin to meter_checker), their local data refreshes and UI updates on next sync
**Plans**: 4 plans

Plans:
- [x] 04-01-PLAN.md -- RequireRole route guard component + SideMenu navigation filtering by role
- [x] 04-02-PLAN.md -- Role-gated well creation UI (New Well buttons, long-press, write guards) in Dashboard and WellList
- [x] 04-03-PLAN.md -- Super admin cross-farm access (Zustand store, useActiveFarm hook, FarmSelector, Header integration)
- [x] 04-04-PLAN.md -- Role change detection (useRoleChangeDetector hook) + active farm store cleanup on sign-out

### Phase 5: Grower Onboarding
**Goal**: A new farm owner can register and reach their dashboard with a fully set up farm
**Depends on**: Phase 1, Phase 3
**Requirements**: ONBD-01, ONBD-04
**Success Criteria** (what must be TRUE):
  1. New user enters phone number, receives OTP, verifies, fills profile (first name, last name, email), creates farm (name, address), and lands on dashboard with their empty farm
  2. Unknown phone number (no existing account, no invite) automatically enters the grower onboarding flow -- never gets stuck at a "choose your path" screen
  3. User who partially completed onboarding (e.g., created profile but not farm) resumes from where they left off on next login
**Plans**: 2 plans

Plans:
- [x] 05-01-PLAN.md -- Fix PowerSync schema drift, OTP 6-digit, CreateFarmPage back nav, RequireNotOnboarded forward guard
- [x] 05-02-PLAN.md -- VerifyPage redirect fix, resolveNextRoute verification, dead code cleanup, CreateFarmPage refresh retry

### Phase 6: Invite System
**Goal**: Farm owners can invite users by phone and those users auto-join the farm on first login
**Depends on**: Phase 3, Phase 5
**Requirements**: ONBD-02, ONBD-03, USER-03, USER-04, USER-05
**Success Criteria** (what must be TRUE):
  1. Grower fills invite form (first name, last name, phone, role) and a farm_invites record is created with all details
  2. Invited phone number receives an SMS containing the farm name and a link to the app
  3. Invited user opens app, enters their phone number, verifies OTP, and lands directly on the dashboard -- no profile creation or farm selection steps
  4. Invited user's profile is auto-created with the first name and last name provided by the grower during invite
  5. Invited user is assigned to the correct farm with the correct role (admin or meter_checker) without any manual selection
**Plans**: 2 plans

Plans:
- [x] 06-01-PLAN.md -- Split invited_name into first/last name, update RPCs, update AddUserModal + PendingInvitesList + PowerSync schema
- [x] 06-02-PLAN.md -- End-to-end verification: apply migration, update dashboard sync rules, test all scenarios

### Phase 7: User Management
**Goal**: Farm owners and admins can view, manage, and maintain their team from a dedicated page
**Depends on**: Phase 4, Phase 6
**Requirements**: USER-01, USER-02, USER-06, USER-07, USER-08
**Success Criteria** (what must be TRUE):
  1. Users page (/users) shows a list of all farm members with their name and a role badge (Admin, Meter Checker, etc.)
  2. "Show disabled users" toggle reveals disabled accounts in the list with a visual indicator distinguishing them from active users
  3. Grower or admin can disable a user from the list, and that user can no longer log in (but their historical data remains)
  4. Grower or admin can re-enable a previously disabled user, restoring their login access
  5. User can edit their own first name, last name, and email in the Settings page
**Plans**: 2 plans

Plans:
- [x] 07-01-PLAN.md -- Database migration (is_disabled column + disable/enable RPCs), PowerSync schema update, ROLE_BADGE_STYLES, disabled-user session guard
- [x] 07-02-PLAN.md -- UsersPage UI overhaul: colored role badges, "Show disabled users" toggle, disable/enable actions with confirmation dialog

### Phase 8: Subscription Gating
**Goal**: Farm owners see their plan limits and cannot exceed seat allocations
**Depends on**: Phase 7
**Requirements**: SUBS-01, SUBS-02, SUBS-03
**Success Criteria** (what must be TRUE):
  1. Farm owner sees their current seat usage (e.g., "2 of 3 meter checkers used") on the Users page or Settings
  2. When seat limit is reached for a role, the invite form disables that role option and shows a message like "Meter checker seats full"
  3. A "Contact us to upgrade" or similar placeholder appears when limits are hit -- no Stripe or payment flow
**Plans**: 3 plans

Plans:
- [x] 08-01-PLAN.md -- Subscription plan constants (hardcoded Basic: 1 admin + 3 meter checkers) and useSeatUsage hook
- [x] 08-02-PLAN.md -- Seat usage display on Users page (admin and meter checker counts with Full indicator)
- [x] 08-03-PLAN.md -- Invite form role blocking when seats full + "Contact us to upgrade" placeholder

</details>

<details>
<summary>v1.1 Phase Details (Complete)</summary>

### Phase 9: Map Default View
**Goal**: Map shows a meaningful default view based on the farm's location instead of hardcoded Kansas center
**Depends on**: Nothing (first v1.1 phase)
**Requirements**: MAP-01, MAP-02, MAP-03, MAP-04
**Success Criteria** (what must be TRUE):
  1. User with no wells sees the map centered on their farm's US state at a zoom level showing the whole state in satellite view
  2. User with wells sees the map centered on the average of all well coordinates (existing behavior preserved)
  3. User who grants location permission sees the map fly to their GPS position with 1500ms animation (existing behavior preserved)
  4. Long-pressing the map does nothing -- no add well form appears, only normal pan/zoom behavior
**Plans**: 1 plan

Plans:
- [x] 09-01-PLAN.md -- US state coordinates lookup, useFarmState hook, MapView center logic update, long-press removal

### Phase 10: Location Permission Flow
**Goal**: Location permission uses a user-friendly soft-ask pattern instead of auto-requesting on page load
**Depends on**: Phase 9
**Requirements**: LOC-01, LOC-02, LOC-03, LOC-04
**Success Criteria** (what must be TRUE):
  1. Opening the dashboard does NOT trigger the browser's native geolocation permission dialog
  2. A "Use My Location" floating action button is visible on the map
  3. Tapping the FAB shows a custom modal explaining why location is needed, with Allow/No Thanks options
  4. Tapping "Allow" in the modal triggers the native browser permission prompt; granting it flies the map to user location
  5. If permission was previously denied, tapping the FAB shows guidance on how to re-enable in browser settings
**Plans**: 1 plan

Plans:
- [x] 10-01-PLAN.md -- useGeolocation autoRequest option, LocationSoftAskModal, MapView FAB + modal integration

### Phase 11: Dashboard Quality Fixes
**Goal**: All dashboard/map components follow consistent best practices for validation, error handling, and accessibility
**Depends on**: Phase 9
**Requirements**: QUAL-01 through QUAL-09
**Success Criteria** (what must be TRUE):
  1. Calling geolocation in any component is guarded by `navigator.geolocation` existence check -- no crashes in environments without geolocation API
  2. Well save handler does not attempt state updates after DashboardPage unmounts
  3. LocationPickerBottomSheet rejects coordinates outside valid ranges (matching AddWellFormBottomSheet validation)
  4. Service worker caches up to 2000 API entries and 3000 tile entries
  5. AddWellFormBottomSheet allows saving with empty meter serial number (only name and WMIS required)
  6. AddWellFormBottomSheet rejects coordinates outside valid ranges in form validation
  7. WellMarker uses plain constant instead of useMemo for static value
  8. LocationPermissionBanner is announced by screen readers via ARIA role
  9. MapOfflineOverlay retry button does not have redundant aria-label
**Plans**: 1 plan

Plans:
- [x] 11-01-PLAN.md -- US-bounds coordinate validation (shared utility + both forms) and WellMarker useMemo removal

</details>

### Phase 12: Data Foundation
**Goal**: The database tables, sync infrastructure, and query hooks exist so that readings and allocations can be stored, synced, and queried throughout the app
**Depends on**: Phase 11 (existing codebase)
**Requirements**: None (infrastructure phase -- enables Phases 13-16)
**Success Criteria** (what must be TRUE):
  1. A `readings` table exists in Supabase with columns for well_id, value (numeric), recorded_by, recorded_at, gps_latitude, gps_longitude, is_in_range, and the record syncs to PowerSync local database
  2. An `allocations` table exists in Supabase with columns for well_id, period_start, period_end, allocated_af, used_af, is_manual_override, and the record syncs to PowerSync local database
  3. PowerSync connector correctly uploads new readings and allocations created offline, and downloads server-side changes on sync
  4. A `useWellReadings(wellId)` hook returns the readings for a well sorted by date, and a `useWellAllocations(wellId)` hook returns the allocation periods for a well
  5. A `getDistanceToWell(userCoords, wellCoords)` utility returns the distance in feet/meters, and an `isInRange(distance, threshold)` check determines proximity status
**Plans**: 2 plans

Plans:
- [ ] 12-01-PLAN.md -- Supabase migration (readings + allocations tables with RLS) + PowerSync schema, connector, and sync rules
- [ ] 12-02-PLAN.md -- Query hooks (useWellReadings, useWellAllocations) + GPS proximity utility

### Phase 13: Well Detail Page
**Goal**: Users can tap a well on the map and see all its information -- header, usage gauge, status indicators, and readings history -- in a full-page slide-up sheet
**Depends on**: Phase 12
**Requirements**: WELL-01, WELL-02, WELL-03, WELL-04, WELL-05, WELL-06, WELL-07, WELL-08, WELL-09, READ-07, PROX-01
**Success Criteria** (what must be TRUE):
  1. User taps a well marker on the map and a full-page sheet slides up from the bottom showing well details, while the map remains loaded behind it
  2. The well detail sheet displays farm name, well name, serial number, WMIS number, last updated timestamp, and equipment status indicators (Pump, Battery, Meter) with check/X icons
  3. A visual usage gauge bar shows Allocated / Used / Remaining for the current allocation period, or a "Missing Allocation" message when no allocation exists
  4. A scrollable readings history table shows each reading's date, value, user name, and time -- with out-of-range readings marked by a yellow indicator -- or a "No readings yet" message when empty
  5. A back button dismisses the sheet returning to the interactive map, and an edit button navigates to the well edit form
**Plans**: TBD

### Phase 14: Record Meter Reading
**Goal**: Field agents can record a new meter reading with GPS location capture, get warned about suspicious values, and report meter problems -- all working offline
**Depends on**: Phase 13
**Requirements**: READ-01, READ-02, READ-03, READ-04, PROB-01, PROB-02, PROX-02
**Success Criteria** (what must be TRUE):
  1. User taps "+ New Reading" on the well detail page, enters a raw cumulative meter value, and the reading is saved to the local database (syncs when online)
  2. The new reading form displays the well's measurement unit and multiplier (e.g., "GAL x 10.0") so the agent knows what scale to read
  3. When the user submits a reading, their GPS location is automatically captured and stored with the reading, and the reading records whether the user was in range or out of range of the well
  4. If the entered value is within 5 units of the last reading, a warning appears asking the user to double-check -- but they can continue and save anyway
  5. User can switch to a "Meter Problem" tab with checkboxes (Not Working, Battery Dead, Pump Off, Dead Pump), and submitting updates the well's equipment status fields
**Plans**: TBD

### Phase 15: Well Editing & Allocation Management
**Goal**: Users can edit well properties and manage allocation periods with auto-calculated or manually overridden usage values
**Depends on**: Phase 13
**Requirements**: EDIT-01, EDIT-02, EDIT-03, ALLOC-01, ALLOC-02, ALLOC-03, ALLOC-04, ALLOC-05, ALLOC-06
**Success Criteria** (what must be TRUE):
  1. User taps "Edit" on the well detail page and sees a full-page form pre-filled with the well's current name, serial number, WMIS, coordinates, units, multiplier, and equipment status -- and can save changes
  2. The well edit form shows the current allocation count (e.g., "2 Allocations") with a link that navigates to the allocation management page for that well
  3. User can create a new allocation period by specifying start date, end date, and allocated amount in acre-feet (AF)
  4. User can view all allocation periods in a table, edit any period's dates/amounts, or delete a period -- all working offline
  5. Each allocation's "Used" value is auto-calculated from readings within that period (converted to AF via multiplier), but the user can manually override the used value
**Plans**: TBD

### Phase 16: Reading Management & Map Integration
**Goal**: Growers and admins can correct reading data, and the map and well list reflect real allocation and reading data instead of placeholders
**Depends on**: Phase 14, Phase 15
**Requirements**: READ-05, READ-06, WELL-10, WELL-11
**Success Criteria** (what must be TRUE):
  1. Grower or admin can tap a reading in the history list, edit its value, and save the correction -- meter_checker role cannot edit
  2. Grower or admin can delete a reading from the history list with a confirmation prompt -- meter_checker role cannot delete
  3. Well markers on the map display the real allocation percentage (used/allocated from the current period) instead of the hardcoded 100% placeholder
  4. The well list page shows the date and time of the latest reading for each well, so users can see at a glance which wells need attention
**Plans**: TBD

## Progress

**Execution Order:**
- v1.0: Phases 1 -> 8 (complete)
- v1.1: Phases 9 -> 10 -> 11 (complete)
- v2.0: Phases 12 -> 13 -> 14 + 15 (parallel after 13) -> 16

Note: Phases 14 and 15 both depend on Phase 13 and can run in parallel. Phase 16 depends on both 14 and 15.

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Session Stability | 5/5 | Complete | 2026-02-10 |
| 2. Offline Session Resilience | 3/3 | Complete | 2026-02-10 |
| 3. Role Foundation | 4/4 | Complete | 2026-02-10 |
| 4. Permission Enforcement | 4/4 | Complete | 2026-02-11 |
| 5. Grower Onboarding | 2/2 | Complete | 2026-02-11 |
| 6. Invite System | 2/2 | Complete | 2026-02-11 |
| 7. User Management | 2/2 | Complete | 2026-02-11 |
| 8. Subscription Gating | 3/3 | Complete | 2026-02-11 |
| 9. Map Default View | 1/1 | Complete | 2026-02-12 |
| 10. Location Permission Flow | 1/1 | Complete | 2026-02-12 |
| 11. Dashboard Quality Fixes | 1/1 | Complete | 2026-02-12 |
| 12. Data Foundation | 2/2 | Complete   | 2026-02-19 |
| 13. Well Detail Page | 0/TBD | Not started | - |
| 14. Record Meter Reading | 0/TBD | Not started | - |
| 15. Well Editing & Allocation Management | 0/TBD | Not started | - |
| 16. Reading Management & Map Integration | 0/TBD | Not started | - |
