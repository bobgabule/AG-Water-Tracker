# AG Water Tracker

## What This Is

An offline-first PWA for agricultural water management. Farm owners (growers) track wells, manage meter readings, and coordinate field agents (meter checkers) across their farms. The app works offline via PowerSync local-first sync with Supabase as the backend. Built as a mobile-friendly web app with phone OTP authentication.

## Core Value

Field agents can reliably record water meter readings in areas with poor connectivity, and that data syncs automatically when they're back online. The app must never lose data and must never lock users out when they're offline.

## Requirements

### Validated

- ✓ Phone OTP authentication via Supabase + Twilio Verify — existing
- ✓ Well creation with GPS location picking on map — existing
- ✓ Well list view and map view (satellite) with markers — existing
- ✓ Offline-first data sync via PowerSync — existing
- ✓ Farm creation during onboarding — existing
- ✓ Profile creation (first name, last name, email) — existing
- ✓ PWA with service worker caching for map tiles — existing
- ✓ Side menu navigation — existing

### Active

- [ ] Role-based user system (super_admin, grower, admin, meter_checker)
- [ ] Reliable session recovery on app reload (fix loading spinner bug)
- [ ] Reliable dashboard rendering on reload (fix blank page bug)
- [ ] Offline session persistence — trust local session, refresh token when online
- [ ] Error boundaries to prevent white-screen crashes
- [ ] Grower registration flow: phone OTP → verify → profile → create farm → dashboard
- [ ] Invited user registration: phone OTP → verify → auto-assign to farm → dashboard (no profile step)
- [ ] Users page (/users) — list farm members with roles, "Show disabled users" toggle
- [ ] Invite user form — first name, last name, phone number, role (Admin / Meter Checker)
- [ ] Pre-register invite: save user details + farm_id + role to DB, send SMS with app URL
- [ ] Auto-detect invited user on OTP: match phone number to farm_invite, assign farm + role
- [ ] User can update their own profile in settings (name, email)
- [ ] Grower can disable/enable users (soft delete, not hard delete)
- [ ] Super admin view — see and manage all farms, users, wells
- [ ] Subscription gating for user limits (basic: 1 admin + 2 meter checkers) — UI only, no Stripe yet

### v1.1 Active

- [ ] Smart map default center — farm's US state at whole-state zoom (satellite view)
- [ ] Soft-ask location permission flow — FAB + custom modal before browser native dialog
- [ ] Remove long-press → add well form behavior
- [ ] Dashboard code quality — geolocation guards, validation consistency, tile cache, accessibility, form fixes

### Out of Scope

- Stripe payment integration — deferred to future milestone, UI placeholder only
- Push notifications — not needed for MVP
- Real-time chat between users — out of scope
- Email-based auth — phone OTP only
- Multi-farm membership — one user belongs to one farm

## Context

**Existing codebase:** ~4,900 lines across 48 TypeScript/React files. Stack is React 19 + Vite 6 + PowerSync + Supabase + Mapbox GL. Code quality is solid — clean routing, proper PowerSync patterns, well-structured auth flow. Issues are incremental (missing error boundaries, console.log spam, no tests) not architectural.

**Known bugs to fix this milestone:**
1. Session recovery stuck on loading spinner — `fetchOnboardingStatus()` RPC failure blocks `isAuthReady`, no timeout/fallback
2. Dashboard blank page on reload — no Error Boundaries, PowerSync init or map crash unmounts entire React tree
3. `RequireOnboarded` shows infinite spinner if `onboardingStatus` is null after RPC error

**User roles:**
| Role | Label | Who | Permissions |
|------|-------|-----|-------------|
| super_admin | Super Admin | App owner | Everything — all farms, all users, all wells |
| grower | Grower | Farm owner | Manage own farm, wells, users. Pays subscription |
| admin | Admin | Assigned by grower | Manage members, check readings, reports. Must belong to a farm |
| meter_checker | Meter Checker | Field agent | Manage wells, add meter readings. Must belong to a farm |

**Disabled** is a user status (boolean), not a role. Disabled users can't log in but their data is preserved.

**Invite flow (pre-register approach):**
1. Grower fills invite form: first name, last name, phone, role
2. Record created in DB (farm_invites table) with all details + farm_id
3. SMS sent to phone: "You've been invited to [Farm] on AG Water Tracker: [app URL]"
4. Invited user opens app → OTP with their phone number
5. App checks farm_invites for matching phone → creates user profile + farm_member record automatically
6. User lands on dashboard — no manual profile or farm steps needed

**Offline behavior:**
- Registration/login requires internet (OTP needs it)
- Once logged in, session persists locally — app works offline from PowerSync cache
- Token auto-refreshes when back online
- If account revoked server-side and token can't refresh → force re-login

**Reference screenshots:** Native app mockups showing Users page with member list, roles, disabled toggle, and invite form with first name, last name, phone, role fields.

## Constraints

- **Tech stack**: Must keep React 19 + PowerSync + Supabase + Mapbox (existing investment)
- **Auth method**: Phone OTP only via Supabase Auth + Twilio Verify
- **Offline-first**: All data operations must work offline, sync when online
- **No Stripe yet**: Subscription limits enforced in UI/DB only, no payment processing this milestone
- **PWA**: Must remain installable as PWA, no native app wrapper
- **Database**: PowerSync doesn't support BOOLEAN — use INTEGER (0/1) and convert

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Keep existing codebase | ~4,900 lines, solid architecture, working features. Rewrite cost outweighs cleanup | — Pending |
| Pre-register invite flow | Simplest approach — phone number match after OTP, no deep links or tokens needed | — Pending |
| Trust local session offline | Field agents need app access in poor connectivity areas. Auto-refresh token when online | — Pending |
| Roles: super_admin, grower, admin, meter_checker | Matches existing native app design. "Disabled" is a status, not a role | — Pending |
| Separate /users route | Users page is a distinct feature, not buried in settings | — Pending |
| Skip profile for invited users | Grower fills in name during invite. Invited user just does OTP → dashboard | — Pending |

| Static state lookup for map center | Simpler than Mapbox geocoding, no API calls, no latency. 50 entries covers all US states | — Pending |
| Soft-ask before browser geolocation prompt | 40-80% higher acceptance rates. Browser "Block" is permanent. Custom modal gives context first | — Pending |
| Remove long-press add well | Users accidentally trigger it while panning. New Well button flow is sufficient | — Pending |
| meterSerialNumber optional | Business requirement — not all wells have serial numbers at registration time | — Pending |

---
*Last updated: 2026-02-11 after v1.1 milestone creation*
