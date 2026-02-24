# AG Water Tracker

## What This Is

An offline-first PWA for agricultural water management. Farm owners (growers) track wells, record meter readings, manage water allocations, and coordinate field agents (meter checkers) across their farms. Field agents record cumulative meter values at wells with GPS location capture, and the app tracks water usage against allocation periods. The app works offline via PowerSync local-first sync with Supabase as the backend. Built as a mobile-friendly web app with phone OTP authentication.

## Core Value

Field agents can reliably record water meter readings in areas with poor connectivity, and that data syncs automatically when they're back online. The app must never lose data and must never lock users out when they're offline.

## Current Milestone: v4.0 Performance & Perceived Speed

**Goal:** Transform the app from "works correctly" to "feels native-fast" by addressing code splitting, loading state UX, asset optimization, service worker intelligence, and navigation fluidity.

**Target features:**
- Route-level code splitting with lazy-loaded pages and isolated Mapbox chunk
- Loading state collapse (3 sequential spinners → skeleton screens)
- Asset optimization (11MB auth background → <300KB modern formats)
- Intelligent service worker caching for app code and offline auth
- Navigation fluidity (query waterfalls, View Transitions, optimistic UI)

## Requirements

### Validated

- ✓ Phone OTP authentication via Supabase + Twilio Verify -- existing
- ✓ Well creation with GPS location picking on map -- existing
- ✓ Well list view and map view (satellite) with markers -- existing
- ✓ Offline-first data sync via PowerSync -- existing
- ✓ Farm creation during onboarding -- existing
- ✓ Profile creation (first name, last name, email) -- existing
- ✓ PWA with service worker caching for map tiles -- existing
- ✓ Side menu navigation -- existing
- ✓ Role-based user system (super_admin, grower, admin, meter_checker) -- v1.0
- ✓ Session recovery on app reload with timeout fallback -- v1.0
- ✓ Dashboard renders on refresh with error boundaries -- v1.0
- ✓ Offline session persistence with local session trust -- v1.0
- ✓ Error boundaries for component crash recovery -- v1.0
- ✓ Grower registration flow (OTP -> profile -> farm -> dashboard) -- v1.0
- ✓ Invited user auto-onboarding (OTP -> auto-assign -> dashboard) -- v1.0
- ✓ Users page with role badges and disabled user toggle -- v1.0
- ✓ Invite user form with SMS delivery -- v1.0
- ✓ User profile self-edit in settings -- v1.0
- ✓ Disable/enable users (soft delete) -- v1.0
- ✓ Super admin cross-farm access -- v1.0
- ✓ Subscription seat gating (UI only) -- v1.0
- ✓ Smart map default center by farm state -- v1.1
- ✓ Soft-ask location permission flow -- v1.1
- ✓ Long-press add well removed -- v1.1
- ✓ Dashboard quality fixes (validation, cache, accessibility) -- v1.1
- ✓ Well detail page with usage gauge, status indicators, readings history -- v2.0
- ✓ Meter reading recording with GPS auto-capture and similar reading warning -- v2.0
- ✓ Meter problem reporting (updates well equipment status) -- v2.0
- ✓ GPS proximity indicator and out-of-range reading flagging -- v2.0
- ✓ Well editing (name, serial, WMIS, coords, units, multiplier, status) -- v2.0
- ✓ Allocation CRUD (create, view, edit, delete periods) with date picker -- v2.0
- ✓ Usage auto-calculated from readings with manual override -- v2.0
- ✓ Reading edit/delete for grower/admin roles -- v2.0
- ✓ Real allocation percentage on map markers -- v2.0
- ✓ Latest reading dates on well list page -- v2.0
- ✓ Subscription tier DB tables with offline sync -- v3.0
- ✓ DB-driven tier hooks replacing hardcoded limits -- v3.0
- ✓ Well count and seat limit enforcement from DB config -- v3.0
- ✓ Subscription page with tier usage display -- v3.0
- ✓ Permission enforcement (meter checkers gated from editing) -- v3.0
- ✓ Login-only auth flow (onboarding removed) -- v3.0
- ✓ Farm data isolation audit (RLS + sync rules verified) -- v3.0

### Active

<!-- Current scope: v4.0 Performance & Perceived Speed -->

**Code Splitting & Bundle:**
- [ ] Route-level lazy loading for all page components
- [ ] Mapbox GL JS isolated to its own chunk (not in vendor bundle)
- [ ] Preconnect/preload resource hints in HTML
- [ ] Navigation-intent prefetch on menu hover/touch

**Loading States:**
- [ ] PowerSync provider renders children immediately (non-blocking)
- [ ] Sequential auth spinners collapsed into single loading state
- [ ] Skeleton screens for Dashboard, Well List, Well Detail
- [ ] RequireRole shows skeleton instead of blank during loading
- [ ] Sign-out completes in <500ms (was 2s)

**Asset Optimization:**
- [ ] bg-farm.jpg compressed from 11MB to <300KB (AVIF/WebP)
- [ ] Background image lazy-loaded (not fetched for authenticated users)
- [ ] Preconnect hints for Supabase, Mapbox, PowerSync endpoints

**Service Worker:**
- [ ] Navigation preload enabled
- [ ] App code cached intelligently (not just map tiles)
- [ ] Auth pages cached for offline returnability

**Navigation Fluidity:**
- [ ] useSubscriptionTier query waterfall collapsed to single JOIN
- [ ] View Transitions API for smooth page changes
- [ ] Optimistic UI for well creation

### Out of Scope

- Stripe payment integration -- deferred to landing page milestone
- Landing page / marketing site -- separate project, future milestone
- Automatic reporting -- listed as tier feature, implementation deferred
- Push notifications -- not needed for current scale
- Real-time chat between users -- out of scope
- Email-based auth -- phone OTP only
- Multi-farm membership -- one user belongs to one farm
- 30D time period filter for readings -- deferred
- Toggle Unit display for readings -- deferred
- Monthly meter reading report -- deferred
- Reading photos/attachments -- deferred

## Context

**Shipped:** v1.0 MVP + v1.1 Dashboard & Map + v2.0 Meter Readings & Allocations + v3.0 Subscriptions & Permissions.

**Current milestone:** v4.0 Performance & Perceived Speed — code splitting, loading state optimization, asset compression, service worker intelligence, navigation fluidity.

**Codebase:** ~10,439 LOC TypeScript/CSS. Stack is React 19 + Vite 6 + PowerSync + Supabase + Mapbox GL. The app has solid auth, role-based access, invite system, user management, subscription gating, polished map experience, and complete meter reading/allocation workflow.

**What's built:**
- Auth: Phone OTP, session recovery, offline persistence, error boundaries, login-only flow
- Roles: 4-role system with RLS, route guards, UI gating, super admin cross-farm
- Users: Invite system with SMS, user management, disable/enable, subscription gating
- Map: Satellite view with well markers showing real allocation gauges, GPS fly-to, soft-ask location
- Wells: Detail page with slide-up sheet, usage gauge, status indicators, readings history
- Readings: Record/edit/delete with GPS capture, similar reading warning, meter problem reporting
- Allocations: Period-based CRUD with auto-calculated usage and manual override
- Subscriptions: DB-driven tiers, well/seat limits, subscription page, permission enforcement

**Performance bottlenecks identified:**
- No route-level code splitting (all 13 pages eagerly imported, Mapbox bundled with vendor)
- 3 sequential full-screen spinners (RequireAuth → RequireOnboarded → PowerSync init)
- 11.46MB bg-farm.jpg on auth pages (no compression, no modern formats)
- 2-second sign-out delay (PowerSync disconnect timeout)
- RequireRole renders null during loading (blank flash)
- No preconnect/preload hints in HTML
- useSubscriptionTier 2-step query waterfall
- Service worker only caches map tiles, not app code

**Known tech debt / manual steps:**
- PowerSync Dashboard sync rules need updating with `farm_readings` and `farm_allocations` buckets
- Custom Access Token Hook needs manual enablement in Supabase Dashboard
- PowerSync Dashboard sync rules need verification for invited_first_name/invited_last_name

**User roles:**
| Role | Label | Who | Permissions |
|------|-------|-----|-------------|
| super_admin | Super Admin | App owner | Everything -- all farms, all users, all wells |
| grower | Grower | Farm owner | Manage own farm, wells, users. Pays subscription |
| admin | Admin | Assigned by grower | Manage members, check readings, reports. Must belong to a farm |
| meter_checker | Meter Checker | Field agent | View wells, add meter readings. Must belong to a farm |

## Constraints

- **Tech stack**: Must keep React 19 + PowerSync + Supabase + Mapbox (existing investment)
- **Auth method**: Phone OTP only via Supabase Auth + Twilio Verify
- **Offline-first**: All data operations must work offline, sync when online
- **No Stripe yet**: Subscription limits enforced in UI/DB only, no payment processing
- **PWA**: Must remain installable as PWA, no native app wrapper
- **Database**: PowerSync doesn't support BOOLEAN -- use INTEGER (0/1) and convert

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Keep existing codebase | ~4,900 lines, solid architecture, working features. Rewrite cost outweighs cleanup | ✓ Good (grew to ~10,439 LOC across 3 milestones) |
| Pre-register invite flow | Simplest approach -- phone number match after OTP, no deep links or tokens needed | ✓ Good |
| Trust local session offline | Field agents need app access in poor connectivity areas. Auto-refresh token when online | ✓ Good |
| Roles: super_admin, grower, admin, meter_checker | Matches existing native app design. "Disabled" is a status, not a role | ✓ Good |
| Separate /users route | Users page is a distinct feature, not buried in settings | ✓ Good |
| Skip profile for invited users | Grower fills in name during invite. Invited user just does OTP -> dashboard | ✓ Good |
| Static state lookup for map center | Simpler than Mapbox geocoding, no API calls, no latency. 50 entries covers all US states | ✓ Good |
| Soft-ask before browser geolocation prompt | 40-80% higher acceptance rates. Browser "Block" is permanent. Custom modal gives context first | ✓ Good |
| Remove long-press add well | Users accidentally trigger it while panning. New Well button flow is sufficient | ✓ Good |
| meterSerialNumber optional | Business requirement -- not all wells have serial numbers at registration time | ✓ Good |
| Readings are raw cumulative meter values | Agents read the number off the physical meter. Usage derived from difference between readings | ✓ Good |
| Period-based allocations (not annual) | Flexible start/end dates, not locked to calendar year. Multiple periods per well | ✓ Good |
| GPS proximity = flag, not block | Out-of-range readings are saved but flagged. Field agents need flexibility | ✓ Good |
| Meter problems update well status fields | Direct status update instead of separate problem queue. Simpler, matches native app | ✓ Good |
| Auto-calc usage + manual override | Calculated from readings within allocation period, but editable for corrections | ✓ Good |
| Well edit form separate from create | Full-page edit form, not reuse of bottom sheet create form. Better UX for editing | ✓ Good |
| Denormalized farm_id on readings/allocations | BEFORE INSERT triggers for direct PowerSync sync rule filtering (no subqueries) | ✓ Good |
| Meter values stored as TEXT in PowerSync | Preserves decimal precision across sync. REAL would lose precision | ✓ Good |
| GPS proximity via @turf/distance | Client-side Haversine calculation, no server round-trip. Fast and works offline | ✓ Good |
| Well detail sheet with Dialog static prop | Backdrop tap does NOT dismiss -- prevents accidental data loss | ✓ Good |
| react-swipeable for gesture handling | Swipe-down dismiss, swipe-left/right well cycling. Native feel on mobile | ✓ Good |
| Cascade delete via writeTransaction | PowerSync local SQLite doesn't enforce FK cascades, so manual cascade in transaction | ✓ Good |
| react-mobile-picker for date selection | iOS-style scroll wheel for month/year. Better mobile UX than native date input | ✓ Good |
| Batch query hooks with Map<id, T> | O(1) lookup in rendering loops for allocation/reading data per well | ✓ Good |
| Login-only app | Registration moves to future landing page. Cleaner session handling, simpler app | ✓ Good |
| Subscription tiers in DB table | Updatable without code deployment. PowerSync syncs to app. Better than env vars for runtime config | ✓ Good |
| Separate landing page (future) | Marketing + Stripe on www. subdomain, app on app. subdomain. SEO, performance, independence | — Pending |
| Stripe Customer Portal for upgrades | Zero payment UI to build. Webhook updates DB, PowerSync syncs in real-time | — Pending |

---
*Last updated: 2026-02-24 after v4.0 milestone start*
