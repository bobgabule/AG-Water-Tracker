# Roadmap: AG Water Tracker

## Milestones

- v1.0 MVP -- Phases 1-8 (shipped 2026-02-11)
- v1.1 Dashboard & Map -- Phases 9-11 (shipped 2026-02-12)
- v2.0 Meter Readings & Allocations -- Phases 12-16 (shipped 2026-02-21)
- v3.0 Subscriptions & Permissions -- Phases 17-22 (shipped 2026-02-23)
- v4.0 Performance & Perceived Speed -- Phases 23-27 (partial: 23-26 shipped, 27 deferred)
- v4.1 Readings & Allocations Fixes -- Phases 28-29 (shipped 2026-02-25)

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

<details>
<summary>v3.0 -- Subscriptions & Permissions (Phases 17-22) -- Complete</summary>

- [x] **Phase 17: Subscription Database Foundation** - Create subscription_tiers and app_settings tables, add farms.subscription_tier column with tier linkage
- [x] **Phase 18: Tier Sync & Hooks** - PowerSync global bucket sync for config tables, reactive hooks replacing hardcoded plan limits
- [x] **Phase 19: Permission Enforcement** - Extend permission matrix with fine-grained actions, gate well edit/delete and allocation management to grower/admin only
- [x] **Phase 20: Subscription Limits & Page** - Well count and seat limit enforcement from DB-driven config, subscription page showing tier usage
- [x] **Phase 21: Login-Only Auth Flow** - Backend invite auto-matching RPC, remove registration pages, clean login-only path with no-subscription redirect
- [x] **Phase 22: Farm Data Isolation Audit** - Verify RLS policies, PowerSync sync rules, and super_admin bypass filter all data by farm_id

</details>

### v4.0 -- Performance & Perceived Speed (In Progress)

- [x] **Phase 23: Route-Level Code Splitting & Bundle Optimization** - Lazy-load all pages, isolate Mapbox chunk, add resource hints, menu prefetch (completed 2026-02-24)
- [x] **Phase 24: Loading State Collapse & Skeleton Screens** - Non-blocking PowerSync, collapse sequential spinners, skeleton screens, fix sign-out delay (completed 2026-02-24)
- [x] **Phase 25: Asset Optimization** - Compress auth background image (11MB to <300KB), lazy-load for dashboard users (completed 2026-02-24)
- [x] **Phase 26: Service Worker Intelligence** - Navigation preload, app code caching, offline auth page experience (completed 2026-02-25)
- [ ] **Phase 27: Query Optimization & Navigation Fluidity** - Single-query tier lookup, View Transitions API, optimistic well creation

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

<details>
<summary>v3.0 Phase Details (Complete)</summary>

### Phase 17: Subscription Database Foundation
**Goal**: The database has subscription tier configuration tables and farm-to-tier linkage so that tier limits are queryable and updatable without code deploys
**Depends on**: Phase 16 (existing codebase)
**Requirements**: TIER-01, TIER-02, TIER-03
**Plans**: 1 plan (17-01)

### Phase 18: Tier Sync & Hooks
**Goal**: Subscription tier data is available offline in the app and accessed through reactive hooks instead of hardcoded constants
**Depends on**: Phase 17
**Requirements**: TIER-04, TIER-05
**Plans**: 2 plans (18-01, 18-02)

### Phase 19: Permission Enforcement
**Goal**: Meter checkers cannot access well editing or allocation management features in the UI
**Depends on**: Phase 16 (existing codebase)
**Requirements**: PERM-01, PERM-02, PERM-03, PERM-04
**Plans**: 2 plans (19-01, 19-02)

### Phase 20: Subscription Limits & Page
**Goal**: Users see their farm's subscription tier, current usage, and are prevented from exceeding tier limits for wells and seats
**Depends on**: Phase 18, Phase 19
**Requirements**: TIER-06, TIER-07, TIER-08
**Plans**: 2 plans (20-01, 20-02)

### Phase 21: Login-Only Auth Flow
**Goal**: The app is login-only with no self-service registration -- invited users auto-join on first OTP and users without a farm see a clear redirect
**Depends on**: Phase 18, Phase 19
**Requirements**: AUTH-01 through AUTH-07
**Plans**: 3 plans (21-01, 21-02, 21-03)

### Phase 22: Farm Data Isolation Audit
**Goal**: Every database query and sync rule correctly isolates farm data, with verified super_admin cross-farm access
**Depends on**: Phase 17, Phase 18, Phase 19, Phase 20, Phase 21
**Requirements**: ISO-01, ISO-02, ISO-03
**Plans**: 2 plans (22-01, 22-02)

</details>

### v4.0 Phase Details

### Phase 23: Route-Level Code Splitting & Bundle Optimization
**Goal**: Each app section loads only the code it needs -- auth pages never download Mapbox GL JS, and resource hints eliminate DNS waterfalls
**Depends on**: Nothing (first v4.0 phase)
**Requirements**: SPLIT-01, SPLIT-02, SPLIT-03, SPLIT-04, SPLIT-05, ASSET-03
**Plans**: 2 plans
Plans:
- [ ] 23-01-PLAN.md — Per-route Suspense/error boundaries, PageLoader, LazyErrorBoundary, Vite chunk config, resource hints
- [ ] 23-02-PLAN.md — Prefetch system with debounce, dedup, network awareness, mobile sequential prefetch
**Success Criteria** (what must be TRUE):
  1. User opening the login page downloads an auth chunk under 50KB (no Mapbox, no well management code)
  2. Mapbox GL JS loads as a separate chunk only when the user navigates to the dashboard or map view
  3. Every page component is lazy-loaded via React.lazy with a consistent Suspense fallback
  4. Browser DevTools shows preconnect requests for Supabase, Mapbox, PowerSync before any app JS executes
  5. Hovering or touching a side menu link triggers a prefetch of that page's chunk before the user taps

### Phase 24: Loading State Collapse & Skeleton Screens
**Goal**: Returning users see the app shell instantly, and every data page shows structured placeholders instead of blank screens or sequential spinners
**Depends on**: Phase 23 (Suspense boundaries must exist)
**Requirements**: LOAD-01, LOAD-02, LOAD-03, LOAD-04, LOAD-05, LOAD-06, LOAD-07
**Plans**: 2 plans
Plans:
- [ ] 24-01-PLAN.md — Skeleton primitives, non-blocking PowerSync provider, fast sign-out
- [ ] 24-02-PLAN.md — Page-specific skeleton screens, RequireRole skeleton fallback, fade transitions
**Success Criteria** (what must be TRUE):
  1. Returning user with cached auth sees the app shell (header + side menu) within 300ms -- no full-screen spinner
  2. Dashboard shows skeleton screen with placeholder map area and button outlines while data loads
  3. Well List and Well Detail pages show animated skeleton rows/cards instead of blank screen while data loads
  4. RequireRole renders the page skeleton (not blank) while user's role loads from PowerSync
  5. Tapping sign-out returns user to login page in under 500ms (no 2-second freeze)

### Phase 25: Asset Optimization
**Goal**: Auth page background loads fast on any connection and is never fetched by dashboard users
**Depends on**: Nothing (independent -- can run in parallel with Phase 24)
**Requirements**: ASSET-01, ASSET-02
**Success Criteria** (what must be TRUE):
  1. Auth page background loads in under 1 second on 3G -- under 300KB using AVIF/WebP/JPEG fallbacks
  2. Authenticated users navigating directly to dashboard see zero network requests for the background image

### Phase 26: Service Worker Intelligence
**Goal**: The service worker caches app code intelligently, serves pages from cache on repeat visits, and provides a usable offline auth experience
**Depends on**: Phase 23 (needs final chunk structure for caching strategy)
**Requirements**: SW-01, SW-02, SW-03
**Plans**: 1 plan
Plans:
- [x] 26-01-PLAN.md — Workbox navigation preload + WebP precaching, offline auth page banner with disabled form
**Success Criteria** (what must be TRUE):
  1. Navigation preload enabled so service worker boot and navigation fetch happen in parallel
  2. After visiting a page once, subsequent visits load from service worker cache with zero network requests for that chunk
  3. Opening the app offline on the login page shows the cached auth shell with an offline message (not a browser error page)

### Phase 27: Query Optimization & Navigation Fluidity
**Goal**: Data queries are optimized, page transitions are smooth, and well creation feels instant
**Depends on**: Phase 24 (skeleton screens must exist for deferred loading)
**Requirements**: NAV-01, NAV-02, NAV-03
**Plans**: 2 plans
Plans:
- [ ] 27-01-PLAN.md — Single JOIN query for useSubscriptionTier + View Transitions API cross-fade
- [ ] 27-02-PLAN.md — Optimistic well creation with sync failure rollback
**Success Criteria** (what must be TRUE):
  1. useSubscriptionTier fires a single SQL JOIN query instead of two sequential queries
  2. Page transitions show smooth cross-fade via View Transitions API on supported browsers (graceful fallback on others)
  3. New well marker appears on the map immediately after creation, before PowerSync sync completes

### v4.1 Phase Details

### Phase 28: Reading Creation & Validation Fixes
**Goal**: Fix the reading creation/edit flow — threshold warning uses 50-gallon equivalent, validation rejects zero consistently, pump states are mutually exclusive, and GPS failure is surfaced to the user
**Depends on**: Nothing (first v4.1 phase)
**Requirements**: READ-F01, READ-F02, READ-F03, READ-F04
**Success Criteria** (what must be TRUE):
  1. Similar reading warning fires when difference is within 50 gallons (converted from well units via multiplier)
  2. Editing a reading and entering 0 shows a validation error (matches create form)
  3. Selecting Pump Off automatically deselects Dead Pump and vice versa
  4. GPS capture failure shows a warning screen with Retry and Save Without GPS options

### Phase 29: Well Detail & Allocation Corrections
**Goal**: Fix allocation defaults, gauge unit labels, and calendar year filtering so the well detail page accurately reflects current-year usage in Acre Feet
**Depends on**: Phase 28
**Requirements**: ALLOC-F01, ALLOC-F02, ALLOC-F03
**Success Criteria** (what must be TRUE):
  1. New allocation form defaults end date to Dec 31 of the current year
  2. Well detail gauge usage is calculated from current calendar year readings only (earliest-to-latest reading difference, converted to AF)
  3. Well detail gauge shows "AF" labels for Allocated, Used, and Remaining regardless of well unit type

## Progress

**Execution Order:**
- v1.0: Phases 1 -> 8 (complete)
- v1.1: Phases 9 -> 10 -> 11 (complete)
- v2.0: Phases 12 -> 13 -> 14 + 15 (parallel after 13) -> 16 (complete)
- v3.0: Phase 17 -> 18 + 19 (parallel) -> 20 -> 21 -> 22 (complete)
- v4.0: Phase 23 -> 24 + 25 (parallel) -> 26 -> 27 (deferred)
- v4.1: Phase 28 -> 29

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
| 17. Subscription Database Foundation | v3.0 | 1/1 | Complete | 2026-02-22 |
| 18. Tier Sync & Hooks | v3.0 | 2/2 | Complete | 2026-02-22 |
| 19. Permission Enforcement | v3.0 | 2/2 | Complete | 2026-02-22 |
| 20. Subscription Limits & Page | v3.0 | 2/2 | Complete | 2026-02-22 |
| 21. Login-Only Auth Flow | v3.0 | 3/3 | Complete | 2026-02-23 |
| 22. Farm Data Isolation Audit | v3.0 | 2/2 | Complete | 2026-02-22 |
| 23. Code Splitting & Bundle | 2/2 | Complete    | 2026-02-24 | — |
| 24. Loading States & Skeletons | 2/2 | Complete    | 2026-02-24 | — |
| 25. Asset Optimization | 1/1 | Complete    | 2026-02-24 | — |
| 26. Service Worker Intelligence | v4.0 | Complete    | 2026-02-25 | 2026-02-25 |
| 27. Query & Navigation Fluidity | 1/2 | In Progress|  | — |
| 28. Reading & Validation Fixes | v4.1 | 1/1 | Complete | 2026-02-25 |
| 29. Well Detail & Allocation Corrections | v4.1 | 1/1 | Complete | 2026-02-25 |

### Phase 30: Drop dead invite code

**Goal:** [To be planned]
**Depends on:** Phase 29
**Plans:** 1/2 plans executed

Plans:
- [ ] TBD (run /gsd:plan-phase 30 to break down)

### Phase 31: Simplify invite user flow with seat limits

**Goal:** [To be planned]
**Depends on:** Phase 30
**Plans:** 0 plans

Plans:
- [ ] TBD (run /gsd:plan-phase 31 to break down)
