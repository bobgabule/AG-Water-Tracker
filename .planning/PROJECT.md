# AG Water Tracker

## What This Is

An offline-first PWA for agricultural water management. Farm owners (growers) track wells, manage meter readings, and coordinate field agents (meter checkers) across their farms. The app works offline via PowerSync local-first sync with Supabase as the backend. Built as a mobile-friendly web app with phone OTP authentication.

## Core Value

Field agents can reliably record water meter readings in areas with poor connectivity, and that data syncs automatically when they're back online. The app must never lose data and must never lock users out when they're offline.

## Requirements

### Validated

- ✓ Phone OTP authentication via Supabase + Twilio Verify — v1.0
- ✓ Well creation with GPS location picking on map — existing
- ✓ Well list view and map view (satellite) with markers — existing
- ✓ Offline-first data sync via PowerSync — existing
- ✓ Farm creation during onboarding — existing
- ✓ Profile creation (first name, last name, email) — existing
- ✓ PWA with service worker caching for map tiles — existing
- ✓ Side menu navigation — existing
- ✓ Role-based user system (super_admin, grower, admin, meter_checker) — v1.0
- ✓ Session recovery on app reload with timeout fallback — v1.0
- ✓ Dashboard renders on refresh with error boundaries — v1.0
- ✓ Offline session persistence with local session trust — v1.0
- ✓ Error boundaries for component crash recovery — v1.0
- ✓ Grower registration flow (OTP → profile → farm → dashboard) — v1.0
- ✓ Invited user auto-onboarding (OTP → auto-assign → dashboard) — v1.0
- ✓ Users page with role badges and disabled user toggle — v1.0
- ✓ Invite user form with SMS delivery — v1.0
- ✓ User profile self-edit in settings — v1.0
- ✓ Disable/enable users (soft delete) — v1.0
- ✓ Super admin cross-farm access — v1.0
- ✓ Subscription seat gating (UI only) — v1.0
- ✓ Smart map default center by farm state — v1.1
- ✓ Soft-ask location permission flow — v1.1
- ✓ Long-press add well removed — v1.1
- ✓ Dashboard quality fixes (validation, cache, accessibility) — v1.1

## Current Milestone: v2.0 Meter Readings & Allocations

**Goal:** Build the core meter reading workflow — field agents record water usage at wells, with GPS verification, allocation tracking, and usage calculations.

**Target features:**
- Well detail page with usage gauge, readings history, and status indicators
- New reading recording with GPS location capture and proximity checking
- Meter problem reporting that updates well equipment status
- Period-based allocation management (CRUD) with auto-calculated + manually overridable usage
- Well edit form for modifying existing well details
- Reading edit/delete for grower/admin correction
- Similar reading warning to catch data entry errors
- GPS proximity display and out-of-range reading flagging

### Active

- [ ] Well detail page accessible from map marker tap and well list item
- [ ] Well detail page shows well info (name, serial number, WMIS #, last updated)
- [ ] Usage gauge showing Allocated / Used / Remaining for current allocation period
- [ ] Status indicators (Pump, Battery, Meter Status) with check/X icons
- [ ] Readings history table (Date, Value in well units, User name, Time)
- [ ] Out-of-range readings marked with yellow indicator in readings list
- [ ] "Missing Allocation" message when well has no allocation periods
- [ ] Record new meter reading (raw cumulative value) with unit/multiplier display
- [ ] GPS location captured automatically with each reading submission
- [ ] "In Range / Out of Range" indicator on well detail page based on GPS proximity
- [ ] Out-of-range status recorded with each reading
- [ ] Similar reading warning (within 5 units of last reading) with Continue option
- [ ] Meter problem reporting (Not Working, Battery Dead, Pump Off, Dead Pump) updates well status
- [ ] Allocation periods CRUD (start date, end date, allocated amount in AF)
- [ ] Multiple allocation periods per well, displayed in table
- [ ] Usage auto-calculated from readings within allocation period (converted to AF)
- [ ] Usage manually overridable by any user with well access
- [ ] Well edit form (name, serial, WMIS, coordinates, units, multiplier, status)
- [ ] Well edit form shows allocation count with link to allocation management
- [ ] Grower/admin can edit an existing reading value
- [ ] Grower/admin can delete a reading

### Out of Scope

- Stripe payment integration — deferred to future milestone, UI placeholder only
- Push notifications — not needed for MVP
- Real-time chat between users — out of scope
- Email-based auth — phone OTP only
- Multi-farm membership — one user belongs to one farm
- 30D time period filter for readings — deferred
- Toggle Unit display for readings — deferred
- Monthly meter reading report — deferred
- Reading photos/attachments — deferred

## Context

**Existing codebase:** Stack is React 19 + Vite 6 + PowerSync + Supabase + Mapbox GL. Through v1.0 and v1.1, the app has solid auth, role-based access, invite system, user management, subscription gating, and polished map experience. The foundation is proven — this milestone adds the core data entry and tracking features.

**Meter reading context (from native app reference):**
- Readings are raw cumulative meter values (not usage amounts) — agents read the number off the physical meter
- GPS proximity determines "In Range" vs "Out of Range" — out-of-range readings are flagged but not blocked
- Allocations are period-based (start/end dates) with allocated amount in acre-feet (AF)
- Usage = (latest reading - first reading in period) × multiplier, converted to AF. Manually overridable.
- Meter problems (Not Working, Battery Dead, Pump Off, Dead Pump) update the well's equipment status fields
- Similar reading warning: if new value is within 5 units of last reading, warn user to double-check

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

**Reference screenshots:** Native app mockups showing well detail page (usage gauge, readings table, status indicators), new reading form (Reading tab + Meter Problem tab), allocation management (period list, add/edit form with date pickers), well edit form, and similar reading warning.

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

| Static state lookup for map center | Simpler than Mapbox geocoding, no API calls, no latency. 50 entries covers all US states | ✓ Good |
| Soft-ask before browser geolocation prompt | 40-80% higher acceptance rates. Browser "Block" is permanent. Custom modal gives context first | ✓ Good |
| Remove long-press add well | Users accidentally trigger it while panning. New Well button flow is sufficient | ✓ Good |
| meterSerialNumber optional | Business requirement — not all wells have serial numbers at registration time | ✓ Good |
| Readings are raw cumulative meter values | Agents read the number off the physical meter. Usage derived from difference between readings | — Pending |
| Period-based allocations (not annual) | Flexible start/end dates, not locked to calendar year. Multiple periods per well | — Pending |
| GPS proximity = flag, not block | Out-of-range readings are saved but flagged. Field agents need flexibility | — Pending |
| Meter problems update well status fields | Direct status update instead of separate problem queue. Simpler, matches native app | — Pending |
| Auto-calc usage + manual override | Calculated from readings within allocation period, but editable for corrections | — Pending |
| Well edit form separate from create | Full-page edit form, not reuse of bottom sheet create form | — Pending |

---
*Last updated: 2026-02-19 after v2.0 milestone creation*
