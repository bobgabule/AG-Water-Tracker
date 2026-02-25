# Phase 27: Query Optimization & Navigation Fluidity - Context

**Gathered:** 2026-02-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Data queries are optimized, page transitions are smooth, and well creation feels instant. Three specific improvements: (1) useSubscriptionTier fires a single JOIN query instead of two sequential queries, (2) page transitions show smooth cross-fade via View Transitions API, (3) new well markers appear on the map immediately after creation via optimistic UI. No new features — this polishes existing behavior.

</domain>

<decisions>
## Implementation Decisions

### Page Transition Style
- All page navigations get a cross-fade animation (consistent across all routes, not selective)
- Quick ~150ms duration — snappy, professional, barely noticeable
- Unsupported browsers: instant swap with no animation (no CSS fallback needed)
- Full-page cross-fade only — no persistent elements across transitions (e.g., map does NOT stay in place)

### Optimistic Well Creation
- Temporary marker looks identical to a synced well — no visual "pending" indicator (no pulsing, no transparency)
- On sync failure: remove the optimistic marker and show a toast error explaining the well wasn't saved
- Map stays at current view position after well creation (no auto-pan/zoom to new marker)
- Optimistic marker is tappable immediately — user can open well detail before sync confirms

### Query Optimization
- Scope limited to useSubscriptionTier only — no audit of other hooks
- Return shape must stay identical — internal optimization only, no consumer changes
- No performance logging or metrics instrumentation
- Correctness is what matters — single JOIN is acceptable even if slightly different timing characteristics
- One fewer round trip is the goal, not raw speed

### Claude's Discretion
- Caching behavior in useSubscriptionTier (preserve existing or adjust as needed)
- Exact View Transitions API implementation details
- Toast error messaging for failed well sync
- How to integrate optimistic state with PowerSync's local-first model

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 27-query-optimization-navigation-fluidity*
*Context gathered: 2026-02-25*
