# Roadmap: AG Water Tracker

## Overview

This roadmap delivers role-based user management and phone-based invite flows for the AG Water Tracker PWA. The work progresses from stabilizing existing session bugs, through building the role and permission infrastructure, to delivering the complete invite-to-onboard pipeline and user management UI. Eight phases move from foundation to features, with each phase delivering a verifiable capability that unblocks the next.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Session Stability** - Fix loading spinner hang, blank page on reload, and add error boundaries
- [x] **Phase 2: Offline Session Resilience** - Offline-first session trust, token refresh failure handling, and offline registration messaging
- [x] **Phase 3: Role Foundation** - Database schema for 4-role system, RLS policies, and PowerSync sync rules
- [ ] **Phase 4: Permission Enforcement** - Client-side route guards, UI gating by role, and super admin cross-farm access
- [x] **Phase 5: Grower Onboarding** - Complete grower registration flow and unknown phone number handling
- [ ] **Phase 6: Invite System** - Invite form, farm_invites backend, SMS delivery, and invited user auto-onboarding
- [ ] **Phase 7: User Management** - Users page, disable/enable users, profile editing, and disabled user filtering
- [ ] **Phase 8: Subscription Gating** - Seat limit display, invite blocking at capacity, and upgrade placeholder

## Phase Details

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
- [ ] 06-02-PLAN.md -- End-to-end verification: apply migration, update dashboard sync rules, test all scenarios

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
- [ ] 07-01-PLAN.md -- Database migration (is_disabled column + disable/enable RPCs), PowerSync schema update, ROLE_BADGE_STYLES, disabled-user session guard
- [ ] 07-02-PLAN.md -- UsersPage UI overhaul: colored role badges, "Show disabled users" toggle, disable/enable actions with confirmation dialog

### Phase 8: Subscription Gating
**Goal**: Farm owners see their plan limits and cannot exceed seat allocations
**Depends on**: Phase 7
**Requirements**: SUBS-01, SUBS-02, SUBS-03
**Success Criteria** (what must be TRUE):
  1. Farm owner sees their current seat usage (e.g., "2 of 3 meter checkers used") on the Users page or Settings
  2. When seat limit is reached for a role, the invite form disables that role option and shows a message like "Meter checker seats full"
  3. A "Contact us to upgrade" or similar placeholder appears when limits are hit -- no Stripe or payment flow
**Plans**: TBD

Plans:
- [ ] 08-01: Subscription plan definition and seat counting logic
- [ ] 08-02: Seat limit display in Users page and Settings
- [ ] 08-03: Invite form role blocking when seats are full and upgrade placeholder

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7 -> 8

Note: Phases 2 and 3 both depend on Phase 1 and could theoretically run in parallel, but sequential execution is recommended to avoid merge conflicts in auth-related code.

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Session Stability | 5/5 | Complete | 2026-02-10 |
| 2. Offline Session Resilience | 3/3 | Complete | 2026-02-10 |
| 3. Role Foundation | 4/4 | Complete | 2026-02-10 |
| 4. Permission Enforcement | 4/4 | Complete | 2026-02-11 |
| 5. Grower Onboarding | 2/2 | Complete | 2026-02-11 |
| 6. Invite System | 2/2 | Complete | 2026-02-11 |
| 7. User Management | 0/4 | Not started | - |
| 8. Subscription Gating | 0/3 | Not started | - |
