# Phase 13: Well Detail Page - Context

**Gathered:** 2026-02-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Full-page slide-up sheet that displays all well information — header with well name/serial/WMIS/status indicators, usage gauge for current allocation, and scrollable readings history. Triggered by tapping a well marker on the map. Editing wells, recording readings, and managing allocations are separate phases.

</domain>

<decisions>
## Implementation Decisions

### Sheet behavior
- Sheet covers ~90% of the viewport, leaving a sliver of map visible at the top (peek)
- Semi-transparent dark overlay (scrim) between the sheet and the map
- Tapping the overlay does NOT dismiss the sheet (prevents accidental dismissal)
- Dismiss via swipe-down gesture + visible back button at the top of the sheet
- No drag handle bar — the back button provides the visual affordance
- Internal scrolling — sheet stays fixed at 90%, content scrolls within it, header stays pinned at top
- Smooth ~350ms ease-in animation when the sheet slides up

### Well-to-well navigation
- Swipe left/right to cycle between wells without dismissing the sheet
- Wells ordered by geographic proximity to the currently viewed well
- No position indicator (dots or counter) — just the well name changes, keeping it minimal

### Claude's Discretion
- Whether the map pans to center on the new well when swiping between wells
- Transition style between wells (horizontal slide vs cross-fade)
- Well info header layout and information hierarchy
- Usage gauge visual design (bar, ring, colors, thresholds)
- Readings history table/card layout and density
- Empty state illustrations and messaging
- Status indicator icon and color design
- Edit button placement and style

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. User wants the sheet to feel like a native mobile bottom sheet with swipe gestures, focused on content rather than chrome.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 13-well-detail-page*
*Context gathered: 2026-02-19*
