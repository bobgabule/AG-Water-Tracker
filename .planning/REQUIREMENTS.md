# Requirements: AG Water Tracker

**Defined:** 2026-02-24
**Core Value:** Field agents can reliably record water meter readings offline, and data syncs automatically when online

## v4.0 Requirements

Requirements for v4.0 Performance & Perceived Speed. Each maps to roadmap phases.

### Code Splitting & Bundle

- [ ] **SPLIT-01**: User opening auth pages downloads only the auth chunk, not Mapbox GL JS or well management code
- [ ] **SPLIT-02**: Mapbox GL JS is isolated to its own chunk, loaded only when the dashboard/map is visited
- [ ] **SPLIT-03**: All 13 page components are lazy-loaded with React.lazy and wrapped in Suspense with consistent fallback UI
- [ ] **SPLIT-04**: index.html includes preconnect hints for Supabase, Mapbox, and PowerSync endpoints
- [ ] **SPLIT-05**: Side menu prefetches target page chunks on hover/touchstart before the user taps

### Loading States

- [ ] **LOAD-01**: PowerSync provider renders app shell (Header + SideMenu) immediately while database initializes in the background
- [ ] **LOAD-02**: Returning user with cached auth sees app shell within 300ms, not a full-screen spinner
- [ ] **LOAD-03**: Dashboard shows skeleton screen (placeholder map area, floating button outlines) while data loads
- [ ] **LOAD-04**: Well List page shows skeleton screen (animated placeholder rows) while data loads
- [ ] **LOAD-05**: Well Detail page shows skeleton screen (header shimmer, metrics placeholders) while data loads
- [ ] **LOAD-06**: RequireRole shows page skeleton instead of blank screen while role loads from PowerSync
- [ ] **LOAD-07**: Sign-out completes in under 500ms (currently 2000ms due to PowerSync disconnect timeout)

### Asset Optimization

- [ ] **ASSET-01**: Auth page background image is under 300KB using AVIF/WebP with compressed JPEG fallback (currently 11.46MB)
- [ ] **ASSET-02**: Background image is not fetched by authenticated users navigating directly to the dashboard
- [ ] **ASSET-03**: Preconnect and dns-prefetch hints eliminate DNS lookup waterfalls for external services

### Service Worker

- [ ] **SW-01**: Navigation preload enabled so service worker boot and navigation fetch happen in parallel
- [ ] **SW-02**: Lazy-loaded page chunks are cached after first visit and served from cache on subsequent visits
- [ ] **SW-03**: Auth pages show app shell from cache when offline (not browser error page), with offline messaging

### Navigation Fluidity

- [ ] **NAV-01**: useSubscriptionTier performs a single JOIN query instead of two sequential queries
- [ ] **NAV-02**: Page transitions use View Transitions API for smooth cross-fade (graceful fallback on unsupported browsers)
- [ ] **NAV-03**: Well creation shows optimistically on the map immediately, before PowerSync sync completes

## Future Requirements

Deferred to future release. Tracked but not in current roadmap.

### Server-Side Enforcement

- **TIER-D1**: Server-side seat/well limit enforcement in RPCs (invite_user_by_phone_impl, well creation)
- **TIER-D2**: Super admin tier management UI for changing farm tiers without direct DB access
- **TIER-D3**: Tier upgrade/downgrade handling for farms exceeding new limits after downgrade

### Payment & Landing Page

- **AUTH-D1**: Stripe Customer Portal integration (webhook updates farms.subscription_tier)
- **AUTH-D2**: Landing page with marketing, pricing, registration, and Stripe Checkout

### RLS Hardening

- **PERM-D1**: Tighten RLS policies for wells/allocations to match UI permission changes (requires deployment gap)

### Reporting

- **RPT-01**: Automatic reporting feature (listed on subscription page, implementation deferred)

### Advanced Performance

- **PERF-D1**: Offline map tile pre-download for specific farm regions
- **PERF-D2**: Background Sync API for queued writes
- **PERF-D3**: Storage quota indicators in Settings

## Out of Scope

| Feature | Reason |
|---------|--------|
| Stripe payment processing | Deferred to landing page milestone |
| Landing page / marketing site | Separate project, future milestone |
| Automatic reporting implementation | Listed as tier feature, built later |
| Offline map tile pre-download | Complexity high, current CacheFirst is sufficient for now |
| Background Sync API | PowerSync handles offline sync well enough |
| Push notifications | Not needed for current scale |
| Real-time chat | Out of scope for this product |
| Custom install prompt | Default browser install prompt is sufficient |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| SPLIT-01 | Phase 23 | Pending |
| SPLIT-02 | Phase 23 | Pending |
| SPLIT-03 | Phase 23 | Pending |
| SPLIT-04 | Phase 23 | Pending |
| SPLIT-05 | Phase 23 | Pending |
| LOAD-01 | Phase 24 | Pending |
| LOAD-02 | Phase 24 | Pending |
| LOAD-03 | Phase 24 | Pending |
| LOAD-04 | Phase 24 | Pending |
| LOAD-05 | Phase 24 | Pending |
| LOAD-06 | Phase 24 | Pending |
| LOAD-07 | Phase 24 | Pending |
| ASSET-01 | Phase 25 | Pending |
| ASSET-02 | Phase 25 | Pending |
| ASSET-03 | Phase 23 | Pending |
| SW-01 | Phase 26 | Pending |
| SW-02 | Phase 26 | Pending |
| SW-03 | Phase 26 | Pending |
| NAV-01 | Phase 27 | Pending |
| NAV-02 | Phase 27 | Pending |
| NAV-03 | Phase 27 | Pending |

**Coverage:**
- v4.0 requirements: 21 total
- Mapped to phases: 21
- Unmapped: 0 ✓

---
*Requirements defined: 2026-02-24*
*Last updated: 2026-02-24 after initial definition*
