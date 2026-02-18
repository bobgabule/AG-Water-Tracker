# Research Summary: Meter Readings, Allocations, GPS Proximity & Well Management

**Domain:** Offline-first agricultural water management -- meter reading recording, GPS proximity verification, period-based allocation management, well detail/editing, problem reporting
**Researched:** 2026-02-19
**Overall confidence:** HIGH

## Executive Summary

This milestone adds the core data-capture features to the existing AG Water Tracker PWA: recording meter readings with GPS proximity verification, managing water allocations, viewing well details, editing wells, and reporting meter problems. Research confirms the existing stack handles nearly everything -- only ONE new npm dependency is needed (`@turf/distance` for GPS distance calculation, same ecosystem as the existing `@turf/circle`).

The most critical finding is the **precision boundary** between PostgreSQL and SQLite. Meter values stored as PostgreSQL `NUMERIC(15,2)` lose precision if mapped to SQLite `REAL` (IEEE 754 float) in the PowerSync schema. The solution is simple: use `column.text` for decimal values and parse client-side. The existing codebase already follows this pattern for `wells.multiplier`.

The second critical finding is that the `readings` and `allocations` tables **do not exist in Supabase**. Migration 013 dropped them; migration 017 only recreated `wells`. A new Supabase migration must be deployed BEFORE any PowerSync schema changes, or all readings will be permanently lost during sync (connector treats missing-table errors as permanent and discards data).

GPS proximity verification happens entirely client-side using the Haversine formula via `@turf/distance`. This is deliberate for offline-first architecture: the user may be offline when recording readings, so server-side GPS verification is not possible. GPS is advisory (WARNING), never blocking -- field workers must always be able to save readings regardless of GPS availability.

Date/time input uses native HTML5 `<input type="date">` and `<input type="datetime-local">` -- no date picker library needed. This is a mobile-first field app where OS-native pickers provide the best UX with zero bundle cost. Unit conversion uses a pure TypeScript utility module with well-established constants (1 AF = 325,851 GAL = 43,560 CF).

## Key Findings

**Stack:** Only 1 new npm package needed: `@turf/distance ^7.3.3`. Everything else uses existing deps, native browser APIs, or custom utility code.

**Architecture:** GPS proximity is client-side only (Haversine via @turf/distance). Meter values stored as TEXT in PowerSync to preserve decimal precision. Readings and allocations follow existing PowerSync patterns (useQuery + useMemo + db.execute for writes).

**Critical pitfall:** The `readings` and `allocations` tables were DROPPED in migration 013 and never recreated. A Supabase migration must be deployed before any other work begins, or all synced data will be silently discarded.

## Implications for Roadmap

Based on research, suggested phase structure:

1. **Database & Schema Foundation** - Deploy Supabase migration + PowerSync schema + connector updates
   - Addresses: Pitfall #3 (ALLOWED_TABLES), Pitfall #4 (tables don't exist), Pitfall #5 (boolean normalization)
   - Rationale: Everything depends on data infrastructure. Without this, no hooks or components can function. Must be first.

2. **Utility Functions & Hooks** - GPS proximity, unit conversion, data query hooks
   - Addresses: Features (GPS proximity check, usage calculation, unit conversion)
   - Rationale: Hooks are consumed by all pages. Building them before UI enables rapid page composition.

3. **Well Detail Page** - Central hub for well information, reading history, allocation display
   - Addresses: Features (well detail, reading history, allocation display, usage vs allocation)
   - Rationale: This page is the navigation target from map markers (already wired). All other features plug into this page.

4. **Record Meter Reading** - Core user workflow: enter value, capture GPS, save
   - Addresses: Features (record reading, GPS capture, similar reading warning, meter problem reporting)
   - Rationale: The primary action users perform. Depends on well detail page for navigation context.

5. **Well Editing & Allocation Management** - Admin features for well properties and allocation CRUD
   - Addresses: Features (well editing, allocation CRUD, period-based allocations)
   - Rationale: Admin-gated features used less frequently. Can be built after core reading workflow.

6. **Integration Polish** - Update markers with real allocation data, list page enhancements
   - Addresses: WellMarker showing real allocation %, reading dates on well list
   - Rationale: Polish that improves existing views with new data. Low risk, high visual impact.

**Phase ordering rationale:**
- Phase 1 MUST be first -- without database tables, everything else fails silently (data loss)
- Phases 2 and 3 are sequential (hooks before pages)
- Phases 4 and 5 can run in parallel after Phase 3
- Phase 6 can begin after Phase 2 (only needs hooks, not full pages)

**Research flags for phases:**
- Phase 1: Needs careful migration design -- allocations schema changed from year-only to period-based
- Phase 4: GPS watchPosition behavior varies across mobile browsers -- test on real devices
- Phase 5: Allocation unit mismatch risk (well units vs allocation units) -- needs clear conversion logic

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Only 1 new dependency (@turf/distance), same ecosystem as existing @turf/circle. All other needs met by existing stack or native browser APIs. Verified via npm, official Turf.js docs, SQLite docs. |
| Features | HIGH | Feature set is well-scoped. Table stakes confirmed via API.md documentation and task.md. Domain knowledge (water measurement units, meter multipliers) verified via authoritative government sources. |
| Architecture | HIGH | Follows 100% of existing codebase patterns (PowerSync useQuery, useMemo, db.execute, Dialog bottom sheets, SegmentedControl). No novel architectural patterns needed. ARCHITECTURE.md already written with full component boundaries and data flows. |
| Pitfalls | HIGH | Critical pitfalls (#1-5) verified via codebase analysis. Migration 013 dropping tables confirmed by reading actual SQL. Floating-point precision issue confirmed by SQLite official docs. Boolean normalization pattern confirmed by existing connector code. |

## Gaps to Address

- **Allocation schema change validation:** The original API.md spec uses `year INTEGER` for allocations. The recommended change to `period_start DATE / period_end DATE` is more flexible but deviates from the original spec. Confirm with stakeholders that period-based allocations are desired before implementing.

- **watchPosition battery impact:** Research confirms `watchPosition` drains battery. The mitigation (only active while reading form is open) is sound in theory but needs real-device testing to verify battery impact during a typical field session (30-60 minutes of intermittent readings).

- **Sync rule complexity for readings:** If a farm has 50+ wells with years of readings, the sync payload could be large. Consider whether to add date windowing to sync rules (e.g., only sync readings from the last 2 years). This is a future optimization, not a blocker for MVP.

- **Meter problem types:** The enum values (`broken_meter`, `damaged_seal`, `no_access`, `frozen`, `vandalism`, `other`) are reasonable defaults but should be validated with actual field workers. Consider making the list configurable per farm in a future iteration.

---
*Research completed: 2026-02-19*
*Ready for roadmap: yes*
