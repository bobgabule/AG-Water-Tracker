# Requirements: AG Water Tracker

**Defined:** 2026-02-24
**Core Value:** Field agents can reliably record water meter readings offline, and data syncs automatically when online

## v4.0 Requirements

Requirements for v4.0 Performance & Perceived Speed. Each maps to roadmap phases.

### Code Splitting & Bundle

- [x] **SPLIT-01**: User opening auth pages downloads only the auth chunk, not Mapbox GL JS or well management code
- [x] **SPLIT-02**: Mapbox GL JS is isolated to its own chunk, loaded only when the dashboard/map is visited
- [x] **SPLIT-03**: All 13 page components are lazy-loaded with React.lazy and wrapped in Suspense with consistent fallback UI
- [x] **SPLIT-04**: index.html includes preconnect hints for Supabase, Mapbox, and PowerSync endpoints
- [x] **SPLIT-05**: Side menu prefetches target page chunks on hover/touchstart before the user taps

### Loading States

- [x] **LOAD-01**: PowerSync provider renders app shell (Header + SideMenu) immediately while database initializes in the background
- [x] **LOAD-02**: Returning user with cached auth sees app shell within 300ms, not a full-screen spinner
- [x] **LOAD-03**: Dashboard shows skeleton screen (placeholder map area, floating button outlines) while data loads
- [x] **LOAD-04**: Well List page shows skeleton screen (animated placeholder rows) while data loads
- [x] **LOAD-05**: Well Detail page shows skeleton screen (header shimmer, metrics placeholders) while data loads
- [x] **LOAD-06**: RequireRole shows page skeleton instead of blank screen while role loads from PowerSync
- [x] **LOAD-07**: Sign-out completes in under 500ms (currently 2000ms due to PowerSync disconnect timeout)

### Asset Optimization

- [x] **ASSET-01**: Auth page background image is under 300KB using AVIF/WebP with compressed JPEG fallback (currently 11.46MB)
- [x] **ASSET-02**: Background image is not fetched by authenticated users navigating directly to the dashboard
- [x] **ASSET-03**: Preconnect and dns-prefetch hints eliminate DNS lookup waterfalls for external services

### Service Worker

- [x] **SW-01**: Navigation preload enabled so service worker boot and navigation fetch happen in parallel
- [x] **SW-02**: Lazy-loaded page chunks are cached after first visit and served from cache on subsequent visits
- [x] **SW-03**: Auth pages show app shell from cache when offline (not browser error page), with offline messaging

### Navigation Fluidity

- [x] **NAV-01**: useSubscriptionTier performs a single JOIN query instead of two sequential queries
- [x] **NAV-02**: Page transitions use View Transitions API for smooth cross-fade (graceful fallback on unsupported browsers)
- [ ] **NAV-03**: Well creation shows optimistically on the map immediately, before PowerSync sync completes

## v4.1 Requirements

Requirements for v4.1 Readings & Allocations Fixes. Each maps to roadmap phases.

### Reading & Validation

- [x] **READ-F01**: Similar reading warning triggers when difference is within 50 gallons (converted from well units via multiplier)
- [x] **READ-F02**: Edit reading form rejects zero values (consistent with create form validation)
- [x] **READ-F03**: Pump Off and Dead Pump checkboxes are mutually exclusive (selecting one deselects the other)
- [x] **READ-F04**: GPS capture failure shows warning screen with retry option instead of silently saving without location

### Well Detail & Allocations

- [x] **ALLOC-F01**: New allocation form defaults end date to December 31 of the current year
- [x] **ALLOC-F02**: Well detail gauge usage is calculated dynamically from current calendar year readings only (all readings still visible in list)
- [x] **ALLOC-F03**: Well detail gauge always displays Acre Feet labels regardless of well unit type

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
| SPLIT-01 | Phase 23 | Complete |
| SPLIT-02 | Phase 23 | Complete |
| SPLIT-03 | Phase 23 | Complete |
| SPLIT-04 | Phase 23 | Complete |
| SPLIT-05 | Phase 23 | Complete |
| LOAD-01 | Phase 24 | Complete |
| LOAD-02 | Phase 24 | Complete |
| LOAD-03 | Phase 24 | Complete |
| LOAD-04 | Phase 24 | Complete |
| LOAD-05 | Phase 24 | Complete |
| LOAD-06 | Phase 24 | Complete |
| LOAD-07 | Phase 24 | Complete |
| ASSET-01 | Phase 25 | Complete |
| ASSET-02 | Phase 25 | Complete |
| ASSET-03 | Phase 23 | Complete |
| SW-01 | Phase 26 | Complete |
| SW-02 | Phase 26 | Complete |
| SW-03 | Phase 26 | Complete |
| NAV-01 | Phase 27 | Complete |
| NAV-02 | Phase 27 | Complete |
| NAV-03 | Phase 27 | Pending |
| READ-F01 | Phase 28 | Complete |
| READ-F02 | Phase 28 | Complete |
| READ-F03 | Phase 28 | Complete |
| READ-F04 | Phase 28 | Complete |
| ALLOC-F01 | Phase 29 | Complete |
| ALLOC-F02 | Phase 29 | Complete |
| ALLOC-F03 | Phase 29 | Complete |

**Coverage:**
- v4.0 requirements: 21 total (18 complete, 3 deferred)
- v4.1 requirements: 7 total
- Mapped to phases: 28
- Unmapped: 0 ✓

---
*Requirements defined: 2026-02-24*
*Last updated: 2026-02-25 after v4.1 complete*
