# Phase 23: Route-Level Code Splitting & Bundle Optimization - Context

**Gathered:** 2026-02-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Each app section loads only the code it needs. Auth pages never download Mapbox GL JS or well management code. Resource hints eliminate DNS/TLS waterfalls for external services. Lazy-loaded pages use consistent Suspense fallbacks. Side menu prefetches page chunks before the user navigates.

</domain>

<decisions>
## Implementation Decisions

### Suspense Fallback UI
- Simple spinner matching existing app style (animate-spin circle, green-500)
- No text label — spinner only
- 150ms delay before showing (avoids flicker on fast loads)
- 300ms minimum display time once visible (prevents jarring flash)
- Content-area only for authenticated pages (header/side menu stay visible)
- Full-viewport centered for auth pages (no app shell)
- Fade in/out transitions (~150ms opacity)
- Same spinner size on all screen sizes
- Route-level Suspense boundaries only (no nested boundaries for sub-components)
- Single PageLoader component with `fullScreen` prop (default: content-area; auth routes pass fullScreen=true)

### Prefetch Strategy
- Desktop: prefetch on hover with 100ms debounce
- Mobile: prefetch Dashboard + Well List sequentially on menu open (Dashboard first, then Well List)
- Dynamic import() method (not `<link rel="prefetch">`)
- Side menu links only (no content links, breadcrumbs, etc.)
- Fetch-once dedup — track prefetched chunks, skip duplicates
- Skip prefetch when `navigator.connection.saveData` is true
- Skip prefetch when `navigator.onLine` is false
- Prefetch dashboard chunk on successful login (during auth transition)

### Chunk Boundaries
- One chunk per page component (maximum code isolation)
- Force Mapbox GL JS into its own manual chunk via Vite manualChunks config
- Mapbox only — no manual chunking for PowerSync or Supabase
- Readable chunk names: `pages/dashboard-[hash].js` pattern
- Single global CSS file (no per-page CSS splitting — Tailwind utilities would duplicate)

### Error Handling on Load Failure
- Auto-retry import once silently; if still fails, show error card
- Error card: simple centered card — "Something went wrong loading this page" + "Reload" button
- Detect ChunkLoadError specifically: show "App updated — reloading..." for ~1 second, then auto-reload
- Reload loop prevention: sessionStorage counter, max 1 auto-reload per session
- Distinguish offline vs server error: if `navigator.onLine` is false, show "You appear to be offline. Check your connection and try again."
- Manual "Reload" button triggers full page reload (`window.location.reload()`)
- One error boundary per route (not one global boundary)
- Error boundary auto-resets on route change (use route path as boundary key)

### Resource Hints
- Preconnect + dns-prefetch for: Supabase API, Mapbox JS CDN, Mapbox tiles API (api.mapbox.com), PowerSync
- Hardcoded in index.html (URLs don't change between deploys)
- Let Vite handle modulepreload for entry chunks (no manual modulepreload)

### Mapbox CSS Loading
- Lazy-load Mapbox CSS with the map chunk (import in map wrapper component, not globally)
- Use full Mapbox CSS as-is (~50KB, gzips to ~8KB) — no tree-shaking or subsetting

### Claude's Discretion
- Whether to enhance existing files in-place or rewrite (LazyErrorBoundary, PageLoader, routePrefetch)
- Crossorigin attribute on preconnect links
- Exact fade transition implementation
- Error boundary componentDidCatch logging

</decisions>

<specifics>
## Specific Ideas

- Keep the existing hardcoded route map in routePrefetch.ts (separate from router config — explicit and simple)
- Existing LazyErrorBoundary.tsx, PageLoader.tsx, and routePrefetch.ts should be enhanced, not replaced
- PageLoader should have a `fullScreen` prop for auth vs authenticated page contexts

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 23-route-level-code-splitting-bundle-optimization*
*Context gathered: 2026-02-24*
