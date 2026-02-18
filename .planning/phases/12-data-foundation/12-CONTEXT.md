# Phase 12: Data Foundation - Context

**Gathered:** 2026-02-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Database tables (readings, allocations), PowerSync schema and connector updates, query hooks (useWellReadings, useWellAllocations), and GPS proximity utility (getDistanceToWell, isInRange). This is infrastructure only — no UI components. Enables Phases 13-16.

</domain>

<decisions>
## Implementation Decisions

### GPS proximity threshold
- Global constant: 500 feet (~150 meters) for all wells
- Not configurable per-well — single constant, can add per-well override in a future phase if needed
- Distance utility returns values in feet (natural for US agricultural users)
- User sees status only: "In Range" or "Out of Range" — no exact distance displayed
- The `is_in_range` boolean stored with each reading is computed at recording time based on this threshold

### Claude's Discretion
- Exact table column types and constraints for readings/allocations (guided by roadmap success criteria + v2.0 decisions)
- RLS policy design for readings and allocations tables
- PowerSync sync rule configuration
- Whether to add well equipment status columns (pump_state, battery_state, meter_status) in this migration or defer to Phase 14
- Allocation period overlap/gap rules (technical constraint design)
- Reading value storage format in Supabase (TEXT vs NUMERIC — PowerSync side already decided as TEXT)
- @turf/distance implementation details

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. Key v2.0 decisions already captured in PROJECT.md:
- Readings are raw cumulative meter values
- Period-based allocations with flexible start/end dates
- Meter values stored as TEXT in PowerSync to preserve decimal precision
- GPS proximity via @turf/distance (client-side Haversine)
- Meter problems directly update well status fields

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 12-data-foundation*
*Context gathered: 2026-02-19*
