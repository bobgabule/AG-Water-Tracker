# Roadmap: AG Water Tracker

## Milestones

- v1.0 MVP -- Phases 1-8 (shipped 2026-02-11)
- v1.1 Dashboard & Map -- Phases 9-11 (shipped 2026-02-12)
- v2.0 Meter Readings & Allocations -- Phases 12-16 (shipped 2026-02-21)
- v3.0 Subscriptions & Permissions -- Phases 17-22 (in progress)

## Phases

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

<details>
<summary>v2.0 -- Meter Readings & Allocations (Phases 12-16) -- Complete</summary>

- [x] **Phase 12: Data Foundation** - Supabase migration for readings + allocations tables, PowerSync schema, connector updates, query hooks, GPS proximity utility
- [x] **Phase 13: Well Detail Page** - Full-page slide-up sheet with well info header, usage gauge, status indicators, readings history, and empty states
- [x] **Phase 14: Record Meter Reading** - New reading form with GPS auto-capture, similar reading warning, meter problem reporting, and proximity flagging
- [x] **Phase 15: Well Editing & Allocation Management** - Well edit form, allocation CRUD (create/view/edit/delete), usage auto-calculation, and manual override
- [x] **Phase 16: Reading Management & Map Integration** - Reading edit/delete for grower/admin, real allocation percentage on map markers, and reading dates on well list

</details>

### v3.0 -- Subscriptions & Permissions (In Progress)

- [x] **Phase 17: Subscription Database Foundation** - Create subscription_tiers and app_settings tables, add farms.subscription_tier column with tier linkage
- [x] **Phase 18: Tier Sync & Hooks** - PowerSync global bucket sync for config tables, reactive hooks replacing hardcoded plan limits (completed 2026-02-22)
- [x] **Phase 19: Permission Enforcement** - Extend permission matrix with fine-grained actions, gate well edit/delete and allocation management to grower/admin only
- [ ] **Phase 20: Subscription Limits & Page** - Well count and seat limit enforcement from DB-driven config, subscription page showing tier usage
- [ ] **Phase 21: Login-Only Auth Flow** - Backend invite auto-matching RPC, remove registration pages, clean login-only path with no-subscription redirect
- [ ] **Phase 22: Farm Data Isolation Audit** - Verify RLS policies, PowerSync sync rules, and super_admin bypass filter all data by farm_id

## Phase Details

<details>
<summary>v1.0 Phase Details (Complete)</summary>

### Phase 1: Session Stability
**Goal**: App never hangs on a loading spinner or shows a blank white page after reload
**Depends on**: Nothing (first phase)
**Requirements**: AUTH-01, AUTH-02, AUTH-03
**Plans**: 5 plans (01-01 through 01-05)

### Phase 2: Offline Session Resilience
**Goal**: Logged-in users can use the app reliably in areas with no connectivity
**Depends on**: Phase 1
**Requirements**: AUTH-04, AUTH-05, AUTH-06
**Plans**: 3 plans (02-01 through 02-03)

### Phase 3: Role Foundation
**Goal**: The database correctly stores and enforces the 4-role system across all data access layers
**Depends on**: Phase 1
**Requirements**: ROLE-01, ROLE-02, ROLE-03
**Plans**: 4 plans (03-01 through 03-04)

### Phase 4: Permission Enforcement
**Goal**: Users only see and can interact with features their role permits
**Depends on**: Phase 3
**Requirements**: ROLE-04, ROLE-05, ROLE-06, ROLE-07
**Plans**: 4 plans (04-01 through 04-04)

### Phase 5: Grower Onboarding
**Goal**: A new farm owner can register and reach their dashboard with a fully set up farm
**Depends on**: Phase 1, Phase 3
**Requirements**: ONBD-01, ONBD-04
**Plans**: 2 plans (05-01 through 05-02)

### Phase 6: Invite System
**Goal**: Farm owners can invite users by phone and those users auto-join the farm on first login
**Depends on**: Phase 3, Phase 5
**Requirements**: ONBD-02, ONBD-03, USER-03, USER-04, USER-05
**Plans**: 2 plans (06-01 through 06-02)

### Phase 7: User Management
**Goal**: Farm owners and admins can view, manage, and maintain their team from a dedicated page
**Depends on**: Phase 4, Phase 6
**Requirements**: USER-01, USER-02, USER-06, USER-07, USER-08
**Plans**: 2 plans (07-01 through 07-02)

### Phase 8: Subscription Gating
**Goal**: Farm owners see their plan limits and cannot exceed seat allocations
**Depends on**: Phase 7
**Requirements**: SUBS-01, SUBS-02, SUBS-03
**Plans**: 3 plans (08-01 through 08-03)

</details>

<details>
<summary>v1.1 Phase Details (Complete)</summary>

### Phase 9: Map Default View
**Goal**: Map shows a meaningful default view based on the farm's location instead of hardcoded Kansas center
**Depends on**: Nothing (first v1.1 phase)
**Requirements**: MAP-01, MAP-02, MAP-03, MAP-04
**Plans**: 1 plan (09-01)

### Phase 10: Location Permission Flow
**Goal**: Location permission uses a user-friendly soft-ask pattern instead of auto-requesting on page load
**Depends on**: Phase 9
**Requirements**: LOC-01, LOC-02, LOC-03, LOC-04
**Plans**: 1 plan (10-01)

### Phase 11: Dashboard Quality Fixes
**Goal**: All dashboard/map components follow consistent best practices for validation, error handling, and accessibility
**Depends on**: Phase 9
**Requirements**: QUAL-01 through QUAL-09
**Plans**: 1 plan (11-01)

</details>

<details>
<summary>v2.0 Phase Details (Complete)</summary>

### Phase 12: Data Foundation
**Goal**: The database tables, sync infrastructure, and query hooks exist so that readings and allocations can be stored, synced, and queried throughout the app
**Depends on**: Phase 11 (existing codebase)
**Requirements**: None (infrastructure phase -- enables Phases 13-16)
**Plans**: 2 plans (12-01 through 12-02)

### Phase 13: Well Detail Page
**Goal**: Users can tap a well on the map and see all its information -- header, usage gauge, status indicators, and readings history -- in a full-page slide-up sheet
**Depends on**: Phase 12
**Requirements**: WELL-01 through WELL-09, READ-07, PROX-01
**Plans**: 3 plans (13-01 through 13-03)

### Phase 14: Record Meter Reading
**Goal**: Field agents can record a new meter reading with GPS location capture, get warned about suspicious values, and report meter problems -- all working offline
**Depends on**: Phase 13
**Requirements**: READ-01 through READ-04, PROB-01, PROB-02, PROX-02
**Plans**: 2 plans (14-01 through 14-02)

### Phase 15: Well Editing & Allocation Management
**Goal**: Users can edit well properties and manage allocation periods with auto-calculated or manually overridden usage values
**Depends on**: Phase 13
**Requirements**: EDIT-01 through EDIT-03, ALLOC-01 through ALLOC-06
**Plans**: 3 plans (15-01 through 15-03)

### Phase 16: Reading Management & Map Integration
**Goal**: Growers and admins can correct reading data, and the map and well list reflect real allocation and reading data instead of placeholders
**Depends on**: Phase 14, Phase 15
**Requirements**: READ-05, READ-06, WELL-10, WELL-11
**Plans**: 2 plans (16-01 through 16-02)

</details>

### v3.0 Phase Details

### Phase 17: Subscription Database Foundation
**Goal**: The database has subscription tier configuration tables and farm-to-tier linkage so that tier limits are queryable and updatable without code deploys
**Depends on**: Phase 16 (existing codebase)
**Requirements**: TIER-01, TIER-02, TIER-03
**Success Criteria** (what must be TRUE):
  1. A `subscription_tiers` table exists with Starter and Pro tiers containing per-role seat limits and well limits
  2. An `app_settings` table exists with key-value config rows including subscription website URL
  3. Every farm has a `subscription_tier` column (NOT NULL, no default) that links to subscription_tiers, with existing farms set to 'pro'
  4. Tier limits can be changed via direct DB update without redeploying the app
**Plans**: 1 plan
Plans:
- [x] 17-01-PLAN.md -- Create subscription tier tables, app settings, and farm-tier linkage migration

### Phase 18: Tier Sync & Hooks
**Goal**: Subscription tier data is available offline in the app and accessed through reactive hooks instead of hardcoded constants
**Depends on**: Phase 17
**Requirements**: TIER-04, TIER-05
**Success Criteria** (what must be TRUE):
  1. Opening the app offline shows correct subscription tier data from local SQLite (not stale or missing)
  2. `useSubscriptionTier()` hook returns the farm's tier limits (seat counts, well limits) from synced data
  3. Changing a tier value in the database propagates to the app within seconds when online
  4. The hardcoded `PLAN_LIMITS` constant in `subscription.ts` is replaced by the DB-driven hook
**Plans**: 2 plans
Plans:
- [x] 18-01-PLAN.md -- Create useAppSetting hook, add AddUserModal loading state, deploy sync rules
- [ ] 18-02-PLAN.md -- Add well count display and Manage Plan button to SubscriptionPage

### Phase 19: Permission Enforcement
**Goal**: Meter checkers cannot access well editing or allocation management features in the UI
**Depends on**: Phase 16 (existing codebase)
**Requirements**: PERM-01, PERM-02, PERM-03, PERM-04
**Success Criteria** (what must be TRUE):
  1. Meter checker navigating to `/wells/:id/edit` is redirected away (route guard)
  2. Meter checker viewing a well detail page does not see the edit button
  3. Meter checker navigating to `/wells/:id/allocations` cannot create, edit, or delete allocations
  4. `permissions.ts` contains `edit_well`, `delete_well`, and `manage_allocations` actions with grower/admin access only
**Plans**: 2 plans
Plans:
- [x] 19-01-PLAN.md -- Update permission matrix to 12-action system, add route guards, gate Users nav item
- [x] 19-02-PLAN.md -- Hide edit button for meter checkers on well detail, hide farm settings on Settings page

### Phase 20: Subscription Limits & Page
**Goal**: Users see their farm's subscription tier, current usage, and are prevented from exceeding tier limits for wells and seats
**Depends on**: Phase 18, Phase 19
**Requirements**: TIER-06, TIER-07, TIER-08
**Success Criteria** (what must be TRUE):
  1. "New Well" button is disabled with a message when the farm has reached its tier well limit (Basic: 5, Pro: 10)
  2. Seat limits on the invite form read from DB-driven tier config instead of hardcoded constants
  3. Subscription page displays current tier name, per-role seat usage, well count vs limit, and a "Manage Plan" link
  4. All limit enforcement works correctly when the app is offline
**Plans**: TBD

### Phase 21: Login-Only Auth Flow
**Goal**: The app is login-only with no self-service registration -- invited users auto-join on first OTP and users without a farm see a clear redirect
**Depends on**: Phase 18 (app_settings for redirect URL), Phase 19 (permissions deployed before auth changes)
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06, AUTH-07
**Success Criteria** (what must be TRUE):
  1. A user with a pending farm invite completes phone OTP and lands directly on the dashboard with correct farm membership (no profile or farm creation steps)
  2. A user without any farm membership sees a "No Subscription" page with a link to the subscription website
  3. The `/onboarding/*` routes, ProfilePage, and CreateFarmPage no longer exist in the app
  4. No dead imports, unused hooks, or orphaned utilities from the old onboarding flow remain in the codebase
  5. The supabaseConnector login path is simplified to: OTP verify -> farm check -> dashboard or no-subscription redirect
**Plans**: TBD

### Phase 22: Farm Data Isolation Audit
**Goal**: Every database query and sync rule correctly isolates farm data, with verified super_admin cross-farm access
**Depends on**: Phase 17, Phase 18, Phase 19, Phase 20, Phase 21
**Requirements**: ISO-01, ISO-02, ISO-03
**Success Criteria** (what must be TRUE):
  1. RLS policies on wells, readings, allocations, and farm_members all filter by farm_id with no bypass for regular users
  2. PowerSync sync rules filter every data table by the user's farm_id, preventing cross-farm data leakage
  3. Super admin can access data across all farms consistently in both RLS policies and sync rules
**Plans**: TBD

## Progress

**Execution Order:**
- v1.0: Phases 1 -> 8 (complete)
- v1.1: Phases 9 -> 10 -> 11 (complete)
- v2.0: Phases 12 -> 13 -> 14 + 15 (parallel after 13) -> 16 (complete)
- v3.0: Phase 17 -> 18 + 19 (parallel) -> 20 -> 21 -> 22

**Critical sequencing notes (v3.0):**
- Phase 19 (Permission UI) must deploy BEFORE any RLS tightening to prevent offline queue corruption
- Phase 21 requires AUTH-06 (backend auto-matching RPC) deployed BEFORE AUTH-01 (registration removal)
- Phases 18 and 19 can run in parallel (no dependency between them)

| Phase | Milestone | Plans | Status | Completed |
|-------|-----------|-------|--------|-----------|
| 1. Session Stability | v1.0 | 5/5 | Complete | 2026-02-10 |
| 2. Offline Session Resilience | v1.0 | 3/3 | Complete | 2026-02-10 |
| 3. Role Foundation | v1.0 | 4/4 | Complete | 2026-02-10 |
| 4. Permission Enforcement | v1.0 | 4/4 | Complete | 2026-02-11 |
| 5. Grower Onboarding | v1.0 | 2/2 | Complete | 2026-02-11 |
| 6. Invite System | v1.0 | 2/2 | Complete | 2026-02-11 |
| 7. User Management | v1.0 | 2/2 | Complete | 2026-02-11 |
| 8. Subscription Gating | v1.0 | 3/3 | Complete | 2026-02-11 |
| 9. Map Default View | v1.1 | 1/1 | Complete | 2026-02-12 |
| 10. Location Permission Flow | v1.1 | 1/1 | Complete | 2026-02-12 |
| 11. Dashboard Quality Fixes | v1.1 | 1/1 | Complete | 2026-02-12 |
| 12. Data Foundation | v2.0 | 2/2 | Complete | 2026-02-19 |
| 13. Well Detail Page | v2.0 | 3/3 | Complete | 2026-02-19 |
| 14. Record Meter Reading | v2.0 | 2/2 | Complete | 2026-02-19 |
| 15. Well Editing & Allocation Management | v2.0 | 3/3 | Complete | 2026-02-19 |
| 16. Reading Management & Map Integration | v2.0 | 2/2 | Complete | 2026-02-19 |
| 17. Subscription Database Foundation | v3.0 | Complete    | 2026-02-21 | 2026-02-22 |
| 18. Tier Sync & Hooks | 2/2 | Complete    | 2026-02-22 | - |
| 19. Permission Enforcement | v3.0 | 2/2 | Complete | 2026-02-22 |
| 20. Subscription Limits & Page | v3.0 | 0/TBD | Not started | - |
| 21. Login-Only Auth Flow | v3.0 | 0/TBD | Not started | - |
| 22. Farm Data Isolation Audit | v3.0 | 0/TBD | Not started | - |
