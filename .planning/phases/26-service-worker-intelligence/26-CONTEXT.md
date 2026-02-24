# Phase 26: Service Worker Intelligence - Context

**Gathered:** 2026-02-25
**Status:** Ready for planning

<domain>
## Phase Boundary

The service worker caches app code intelligently, serves pages from cache on repeat visits, and provides a usable offline auth experience. This phase configures navigation preload, precaching of all page chunks, and an offline-capable login page. In-app offline indicators and API caching are out of scope (PowerSync handles data sync).

</domain>

<decisions>
## Implementation Decisions

### Offline auth page experience
- Show the full login form (PhonePage) with the normal auth layout (background, logo, phone input)
- Amber/warning-style banner appears above the form card: "You're offline — connect to sign in"
- Phone input is visible but disabled while offline
- Banner auto-dismisses with fade animation when connectivity returns, form re-enables
- Only PhonePage gets the offline banner — VerifyPage uses existing error handling for mid-OTP offline
- In-app offline indicators for authenticated users are out of scope for this phase

### Offline page serving
- SW serves the actual SPA shell when offline (not a generic fallback page)
- React router handles routing to the login page for unauthenticated users
- Authenticated users with cached localStorage session get the dashboard shell with PowerSync cached data
- Include the WebP auth background image (~229KB) in the precache — offline login page looks identical to online

### App update experience
- Silent auto-update — keep current `autoUpdate` behavior, no toast or prompt
- No forced-reload mechanism — trust that next navigation picks up new version
- Check for updates on every navigation (standard Workbox behavior)

### Cache warming scope
- Precache ALL lazy-loaded page chunks upfront (full offline capability after first load)
- Keep current 5MB per-file maximumFileSizeToCacheInBytes limit
- Old precache entries cleaned up immediately when new SW activates (Workbox default)

### What NOT to cache in SW
- Supabase/PowerSync API responses — PowerSync's SQLite offline engine handles this
- Mapbox tiles/API: keep existing runtime CacheFirst strategy unchanged (7-day TTL, location-dependent)
- No custom font caching needed — app uses system font stack

### Claude's Discretion
- Navigation preload implementation details
- Workbox configuration specifics for chunk caching
- Exact offline banner component structure and animation timing
- How to wire useOnlineStatus into the PhonePage offline banner

</decisions>

<specifics>
## Specific Ideas

- Offline login page should look identical to online (same background, logo, form layout) — just with the amber banner and disabled input
- Banner placement: between logo and form card, within the normal AuthLayout content flow
- Auto-dismiss on reconnect should feel smooth — fade out, then form enables

</specifics>

<deferred>
## Deferred Ideas

- In-app offline indicator for authenticated users (global banner when offline inside the app) — future phase or backlog
- Offline map tile pre-download for specific farm regions — listed in REQUIREMENTS.md as PERF-D1
- Background Sync API for queued writes — listed as PERF-D2 (PowerSync handles this)

</deferred>

---

*Phase: 26-service-worker-intelligence*
*Context gathered: 2026-02-25*
