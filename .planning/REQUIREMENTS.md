# Requirements: AG Water Tracker

**Defined:** 2026-02-10
**Core Value:** Field agents can reliably record water meter readings offline, and data syncs automatically when online

## v1 Requirements

### Auth & Session

- [ ] **AUTH-01**: Session recovery works reliably on app reload — no loading spinner hang
- [ ] **AUTH-02**: Dashboard renders correctly on page refresh — no blank white page
- [ ] **AUTH-03**: Error Boundaries catch component crashes and show recovery UI instead of blank screen
- [ ] **AUTH-04**: App works offline for logged-in users — trust local session, refresh token when online
- [ ] **AUTH-05**: If token refresh fails (account revoked), force re-login with clear message
- [ ] **AUTH-06**: Registration requires internet — show clear "no connection" message if offline during OTP

### Onboarding

- [ ] **ONBD-01**: Grower registration: phone OTP → verify → create profile (first name, last name, email) → create farm (name, address) → dashboard
- [ ] **ONBD-02**: Invited user registration: phone OTP → verify → auto-match to farm via phone number → dashboard (no profile or farm steps)
- [ ] **ONBD-03**: Invited user's profile auto-created from invite data (first name, last name pre-filled by farm owner)
- [ ] **ONBD-04**: Unknown phone number (no invite, no existing account) creates new grower account and goes through full onboarding

### Roles & Permissions

- [ ] **ROLE-01**: Four roles stored in farm_members.role: super_admin, grower, admin, meter_checker
- [ ] **ROLE-02**: Supabase RLS policies enforce role-based data access at the database level
- [ ] **ROLE-03**: PowerSync sync rules filter data by farm_id so users only see their farm's data
- [ ] **ROLE-04**: Client-side route guards and UI gating based on user role (admin-only sections hidden for meter_checker)
- [ ] **ROLE-05**: Super admin can see and manage all farms, users, and wells across the system
- [ ] **ROLE-06**: Grower and admin can manage users and wells within their own farm
- [ ] **ROLE-07**: Meter checker can view wells, add meter readings, but cannot manage users or farm settings

### User Management

- [ ] **USER-01**: Users page (/users) shows list of farm members with name and role badge
- [ ] **USER-02**: Users page has "Show disabled users" toggle to filter disabled accounts
- [ ] **USER-03**: Invite user form with fields: first name, last name, phone number, role (Admin / Meter Checker)
- [ ] **USER-04**: Invite creates a farm_invites record with all user details + farm_id + role
- [ ] **USER-05**: SMS sent to invited phone number with app URL and farm name
- [ ] **USER-06**: Grower/admin can disable a user (soft delete — user can't log in, data preserved)
- [ ] **USER-07**: Grower/admin can re-enable a disabled user
- [ ] **USER-08**: User can update their own profile (first name, last name, email) in settings

### Subscription

- [ ] **SUBS-01**: Subscription seat limits displayed in UI (e.g., "Basic: 1 admin + 2 meter checkers")
- [ ] **SUBS-02**: Invite form blocked with message when seat limit reached for a role
- [ ] **SUBS-03**: No Stripe integration — limits enforced in UI/DB only, "Contact us to upgrade" placeholder

## v1.1 Requirements

### Dashboard & Map

- [ ] **MAP-01**: Map centers on farm's US state (whole-state satellite view) when no wells exist, using a static state→coordinates lookup
- [ ] **MAP-02**: Map centers on average of all well coordinates when wells exist
- [ ] **MAP-03**: User location fly-to with 1500ms animation when GPS is granted
- [ ] **MAP-04**: Long-press on map does NOT trigger add well form — long-press behavior removed entirely

### Location Permission

- [ ] **LOC-01**: No automatic geolocation request on page load — location only requested after user action
- [ ] **LOC-02**: "Use My Location" floating action button displayed on the map
- [ ] **LOC-03**: Custom soft-ask modal shown before triggering the browser's native permission dialog
- [ ] **LOC-04**: Settings guidance displayed when location permission is denied (keep existing LocationPermissionBanner pattern)

### Code Quality

- [ ] **QUAL-01**: Geolocation API existence checked (`navigator.geolocation`) before calling in all components
- [ ] **QUAL-02**: Well save handler in DashboardPage guards against component unmount during async operation
- [ ] **QUAL-03**: LocationPickerBottomSheet validates coordinate ranges (-90/90 lat, -180/180 lng) matching AddWellFormBottomSheet
- [ ] **QUAL-04**: Service worker tile cache maxEntries increased for large farm areas (800→2000 API, 1000→3000 tiles)
- [ ] **QUAL-05**: AddWellFormBottomSheet meterSerialNumber field is optional (not required for form validation)
- [ ] **QUAL-06**: AddWellFormBottomSheet isFormValid includes coordinate range validation
- [ ] **QUAL-07**: WellMarker removes unnecessary useMemo wrapping a constant value
- [ ] **QUAL-08**: LocationPermissionBanner has proper ARIA role attribute for screen reader announcements
- [ ] **QUAL-09**: MapOfflineOverlay removes redundant aria-label that duplicates visible button text

## v2 Requirements

### User Management Enhancements

- **USER-09**: Resend invite SMS if first delivery failed or invite expired
- **USER-10**: Change user role (promote member to admin or demote)
- **USER-11**: Show user last active timestamp (last sync/login)
- **USER-12**: Auto-clean expired invites with re-invite flow
- **USER-13**: Confirmation dialog for disable/remove actions

### Subscription & Billing

- **SUBS-04**: Stripe integration for subscription payments
- **SUBS-05**: Automatic seat limit enforcement at payment tier level

### Platform

- **PLAT-01**: Multi-farm membership (user belongs to multiple farms)
- **PLAT-02**: User activity audit log
- **PLAT-03**: Bulk invite via CSV upload

## Out of Scope

| Feature | Reason |
|---------|--------|
| Granular per-feature permissions | 4 simple roles sufficient. AgriWebb has 12+ roles — creates admin burden. Farmable's 4-role model validates our approach |
| Self-service role change | Security risk. Farm owners control access, not field workers |
| Email-based invites | Target users are field workers who check email infrequently. Phone SMS is the right channel |
| Password-based auth | Maintaining two auth methods doubles complexity. Phone OTP only |
| Real-time invite codes | Codes can be shared uncontrollably, bypasses admin intent. Phone-targeted invites give explicit control |
| Multi-farm membership (v1) | Adds complexity to every query, sync rule, UI component. Premature for MVP |
| Stripe payment (v1) | Need product validation first. UI-only seat limits sufficient |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 1: Session Stability | Pending |
| AUTH-02 | Phase 1: Session Stability | Pending |
| AUTH-03 | Phase 1: Session Stability | Pending |
| AUTH-04 | Phase 2: Offline Session Resilience | Pending |
| AUTH-05 | Phase 2: Offline Session Resilience | Pending |
| AUTH-06 | Phase 2: Offline Session Resilience | Pending |
| ONBD-01 | Phase 5: Grower Onboarding | Pending |
| ONBD-02 | Phase 6: Invite System | Pending |
| ONBD-03 | Phase 6: Invite System | Pending |
| ONBD-04 | Phase 5: Grower Onboarding | Pending |
| ROLE-01 | Phase 3: Role Foundation | Pending |
| ROLE-02 | Phase 3: Role Foundation | Pending |
| ROLE-03 | Phase 3: Role Foundation | Pending |
| ROLE-04 | Phase 4: Permission Enforcement | Pending |
| ROLE-05 | Phase 4: Permission Enforcement | Pending |
| ROLE-06 | Phase 4: Permission Enforcement | Pending |
| ROLE-07 | Phase 4: Permission Enforcement | Pending |
| USER-01 | Phase 7: User Management | Pending |
| USER-02 | Phase 7: User Management | Pending |
| USER-03 | Phase 6: Invite System | Pending |
| USER-04 | Phase 6: Invite System | Pending |
| USER-05 | Phase 6: Invite System | Pending |
| USER-06 | Phase 7: User Management | Pending |
| USER-07 | Phase 7: User Management | Pending |
| USER-08 | Phase 7: User Management | Pending |
| SUBS-01 | Phase 8: Subscription Gating | Pending |
| SUBS-02 | Phase 8: Subscription Gating | Pending |
| SUBS-03 | Phase 8: Subscription Gating | Pending |

**v1 Coverage:**
- v1 requirements: 28 total
- Mapped to phases: 28
- Unmapped: 0

### v1.1 Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| MAP-01 | Phase 9: Map Default View | Pending |
| MAP-02 | Phase 9: Map Default View | Pending |
| MAP-03 | Phase 9: Map Default View | Pending |
| MAP-04 | Phase 9: Map Default View | Pending |
| LOC-01 | Phase 10: Location Permission Flow | Pending |
| LOC-02 | Phase 10: Location Permission Flow | Pending |
| LOC-03 | Phase 10: Location Permission Flow | Pending |
| LOC-04 | Phase 10: Location Permission Flow | Pending |
| QUAL-01 | Phase 11: Dashboard Quality Fixes | Pending |
| QUAL-02 | Phase 11: Dashboard Quality Fixes | Pending |
| QUAL-03 | Phase 11: Dashboard Quality Fixes | Pending |
| QUAL-04 | Phase 11: Dashboard Quality Fixes | Pending |
| QUAL-05 | Phase 11: Dashboard Quality Fixes | Pending |
| QUAL-06 | Phase 11: Dashboard Quality Fixes | Pending |
| QUAL-07 | Phase 11: Dashboard Quality Fixes | Pending |
| QUAL-08 | Phase 11: Dashboard Quality Fixes | Pending |
| QUAL-09 | Phase 11: Dashboard Quality Fixes | Pending |

**v1.1 Coverage:**
- v1.1 requirements: 17 total
- Mapped to phases: 17
- Unmapped: 0

---
*Requirements defined: 2026-02-10*
*Last updated: 2026-02-11 after v1.1 milestone creation*
