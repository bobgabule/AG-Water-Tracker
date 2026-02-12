# Phase 11: Dashboard Quality Fixes - Context

**Gathered:** 2026-02-12
**Status:** Ready for planning

<domain>
## Phase Boundary

Harden all dashboard/map components with consistent validation, error handling, and accessibility. Nine specific fixes across geolocation guards, coordinate validation, tile cache sizing, form requirements, static value optimization, and ARIA attributes.

</domain>

<decisions>
## Implementation Decisions

### Coordinate validation
- Use US-only bounds (approx lat 18-72°N, lng -180 to -66°W) covering continental US + Alaska + Hawaii
- Reject coordinates outside these bounds with inline error messaging
- Claude's discretion on exact validation UX pattern (match existing form patterns)
- Claude's discretion on whether to share validation constants/function between LocationPickerBottomSheet and AddWellFormBottomSheet, or keep separate
- Claude's discretion on whether map picker enforces bounds visually or just validates on submit

### Form field requirements
- Meter serial number field stays visible on the form, just not required — no "(Optional)" label suffix
- Required fields: well name + WMIS ID + coordinates (all three must be filled)
- Save button disabled until all required fields are filled (not validate-on-submit)
- No extra label or indicator for optional fields

### Claude's Discretion
- Validation UX pattern for coordinate errors (match existing app patterns)
- Shared vs separate validation logic between forms
- Map picker bounds enforcement approach
- All accessibility implementation details (ARIA roles, aria-label cleanup)
- Geolocation guard implementation
- Unmount safety pattern for well save handler
- WellMarker static value optimization
- Tile cache size values

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches for all implementation details.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 11-dashboard-quality-fixes*
*Context gathered: 2026-02-12*
