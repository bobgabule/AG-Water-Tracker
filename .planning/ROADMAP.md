# Roadmap: AG Water Tracker

## Milestones

- v1.0 MVP -- Phases 1-8 (shipped 2026-02-11)
- v1.1 Dashboard & Map -- Phases 9-11 (shipped 2026-02-12)
- v2.0 Meter Readings & Allocations -- Phases 12-16 (shipped 2026-02-21)

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

- [x] **Phase 12: Data Foundation** - Supabase migration for readings + allocations tables, PowerSync schema, connector updates, query hooks, GPS proximity utility (completed 2026-02-19)
- [x] **Phase 13: Well Detail Page** - Full-page slide-up sheet with well info header, usage gauge, status indicators, readings history, and empty states (completed 2026-02-19)
- [x] **Phase 14: Record Meter Reading** - New reading form with GPS auto-capture, similar reading warning, meter problem reporting, and proximity flagging (completed 2026-02-19)
- [x] **Phase 15: Well Editing & Allocation Management** - Well edit form, allocation CRUD (create/view/edit/delete), usage auto-calculation, and manual override (completed 2026-02-19)
- [x] **Phase 16: Reading Management & Map Integration** - Reading edit/delete for grower/admin, real allocation percentage on map markers, and reading dates on well list (completed 2026-02-19)

</details>

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

## Progress

**Execution Order:**
- v1.0: Phases 1 -> 8 (complete)
- v1.1: Phases 9 -> 10 -> 11 (complete)
- v2.0: Phases 12 -> 13 -> 14 + 15 (parallel after 13) -> 16 (complete)

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
