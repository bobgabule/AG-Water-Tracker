# Phase 24: Loading State Collapse & Skeleton Screens - Context

**Gathered:** 2026-02-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace blank screens, sequential spinners, and blocking PowerSync initialization with structured skeleton placeholders and a non-blocking app shell. Returning users see the app shell (header + side menu) instantly while data loads in the background. Every data page shows high-fidelity skeleton screens. Sign-out completes in under 500ms.

</domain>

<decisions>
## Implementation Decisions

### Skeleton Visual Style
- Shimmer sweep animation (light gradient sweeps left-to-right, ~1.5s consistent cycle)
- High-fidelity placeholders that closely mirror actual component sizes and positions
- Subtle contrast colors (gray-100/gray-200 on white background)
- CSS-only implementation using Tailwind @keyframes -- zero bundle impact
- Reusable skeleton primitives (SkeletonLine, SkeletonBlock, SkeletonCircle) composed into page-specific layouts
- Text-line placeholders vary in width (100%, 80%, 60%) to mimic natural text
- Skeleton borders/edges match existing component rounding (same Tailwind rounded classes)
- Well List shows enough placeholder rows to fill the viewport (~5-6 rows)
- Map placeholder: gray rectangle with subtle grid lines/crosshair to suggest "map loading here"
- Shimmer direction: left-to-right
- Basic aria accessibility: aria-busy and aria-label on skeleton containers
- Header always renders fully (no skeleton for header itself)
- Always show skeletons immediately (no delay threshold)

### App Shell Definition
- App shell = Header + SideMenu + current page's skeleton placeholder, all rendered instantly
- PowerSync initializes non-blocking in the background -- app shell + skeletons show immediately
- Side menu is interactive immediately -- links work, navigating shows the target page's skeleton
- If user navigates before PowerSync is ready, target page shows its skeleton
- RequireRole guard renders the page skeleton (not a generic loading indicator) while role resolves
- Returning users only -- first-ever visit goes through normal auth flow
- Offline: show app shell with cached data from PowerSync's local database

### Content Transition
- Fade crossfade (~200ms) from skeleton to real content
- All-at-once swap per page -- wait until all page data is ready, then swap entire skeleton
- Mapbox map waits for its `load` event before transitioning from skeleton (no half-loaded map)
- No minimum skeleton display time -- if data loads in 50ms, show content immediately
- Page navigation: incoming page shows its skeleton immediately (no keep-old-page pattern)
- Empty states: show skeleton briefly while checking, then transition to empty state message
- Error states: skeleton disappears, error message with retry button replaces it
- Subsequent visits to cached pages skip skeleton and show content instantly

### Sign-out Behavior
- Instant redirect to login page on sign-out -- no visible delay or spinner
- PowerSync cleanup (disconnect + clear local DB) happens in background AFTER redirect
- Clear local PowerSync database on sign-out for security
- If background cleanup fails, ignore silently -- next login re-initializes fresh

### Claude's Discretion
- Well Detail skeleton section structure (labeled vs generic blocks)
- Dashboard FAB skeleton treatment (skeleton circles vs hide until loaded)
- Farm name in header/sidebar placeholder handling (depends on data source)
- Fade transition implementation (CSS transitions vs React startTransition)

</decisions>

<specifics>
## Specific Ideas

No specific requirements -- open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

None -- discussion stayed within phase scope

</deferred>

---

*Phase: 24-loading-state-collapse-skeleton-screens*
*Context gathered: 2026-02-24*
