# Milestones

## v2.0 Meter Readings & Allocations (Shipped: 2026-02-21)

**Phases:** 12-16 (5 phases, 12 plans)
**Timeline:** 2026-01-31 to 2026-02-19 (20 days)
**Requirements:** 31/31 delivered
**Files changed:** 111 (19,351 insertions, 469 deletions)

**Key accomplishments:**
- Data foundation: readings + allocations Supabase tables with RLS, PowerSync schema/connector, GPS proximity utility
- Well detail page: full-page slide-up sheet with usage gauge, status indicators, readings history, swipe gestures
- Meter reading recording: new reading form with GPS auto-capture, similar reading warning, meter problem reporting
- Well editing & allocation management: well edit form, allocation CRUD with MonthYearPicker, usage auto-calculation + manual override
- Reading management & map integration: reading edit/delete for grower/admin, real allocation gauges on map, reading dates on well list

**Cumulative (v1.0 + v1.1 + v2.0):** 16 phases, 40 plans across 3 milestones

---

## v1.1 Dashboard & Map (Shipped: 2026-02-12)

**Phases:** 9-11 (3 phases, 3 plans)
**Requirements:** 17/17 delivered

**Key accomplishments:**
- Smart map default center using farm US state lookup
- Soft-ask location permission flow with custom modal
- Dashboard quality fixes (validation, cache, accessibility)

---

## v1.0 MVP (Shipped: 2026-02-11)

**Phases:** 1-8 (8 phases, 25 plans)
**Requirements:** 28/28 delivered

**Key accomplishments:**
- Session stability with error boundaries and recovery
- Offline session persistence and token refresh
- Role-based access (super_admin, grower, admin, meter_checker) with RLS
- Client-side permission enforcement with route guards
- Grower onboarding and invite system with SMS
- User management page with disable/enable
- Subscription seat gating (UI only)

---
