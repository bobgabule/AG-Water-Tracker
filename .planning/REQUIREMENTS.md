# Requirements: AG Water Tracker

**Defined:** 2026-02-10
**Core Value:** Field agents can reliably record water meter readings offline, and data syncs automatically when online

## v1.0 Requirements (Complete)

### Auth & Session (6/6 Complete)

- [x] **AUTH-01**: Session recovery works reliably on app reload
- [x] **AUTH-02**: Dashboard renders correctly on page refresh
- [x] **AUTH-03**: Error Boundaries catch component crashes
- [x] **AUTH-04**: App works offline for logged-in users
- [x] **AUTH-05**: Token refresh failure forces re-login with clear message
- [x] **AUTH-06**: Registration requires internet with clear offline message

### Onboarding (4/4 Complete)

- [x] **ONBD-01**: Grower registration flow (OTP -> profile -> farm -> dashboard)
- [x] **ONBD-02**: Invited user auto-match to farm via phone number
- [x] **ONBD-03**: Invited user's profile auto-created from invite data
- [x] **ONBD-04**: Unknown phone number enters grower onboarding

### Roles & Permissions (7/7 Complete)

- [x] **ROLE-01**: Four roles in farm_members.role
- [x] **ROLE-02**: Supabase RLS policies enforce role-based access
- [x] **ROLE-03**: PowerSync sync rules filter by farm_id
- [x] **ROLE-04**: Client-side route guards and UI gating by role
- [x] **ROLE-05**: Super admin cross-farm access
- [x] **ROLE-06**: Grower/admin manage own farm
- [x] **ROLE-07**: Meter checker limited to wells and readings

### User Management (8/8 Complete)

- [x] **USER-01**: Users page with role badges
- [x] **USER-02**: Show disabled users toggle
- [x] **USER-03**: Invite user form (name, phone, role)
- [x] **USER-04**: farm_invites record creation
- [x] **USER-05**: SMS delivery to invited phone
- [x] **USER-06**: Disable user (soft delete)
- [x] **USER-07**: Re-enable disabled user
- [x] **USER-08**: Profile self-edit in settings

### Subscription (3/3 Complete)

- [x] **SUBS-01**: Seat limits displayed in UI
- [x] **SUBS-02**: Invite blocked at seat capacity
- [x] **SUBS-03**: UI-only gating, no Stripe

## v1.1 Requirements (Complete)

### Dashboard & Map (4/4 Complete)

- [x] **MAP-01**: Map centers on farm's US state when no wells
- [x] **MAP-02**: Map centers on well coordinates average
- [x] **MAP-03**: GPS fly-to with 1500ms animation
- [x] **MAP-04**: Long-press add well removed

### Location Permission (4/4 Complete)

- [x] **LOC-01**: No automatic geolocation on page load
- [x] **LOC-02**: "Use My Location" FAB on map
- [x] **LOC-03**: Custom soft-ask modal before browser prompt
- [x] **LOC-04**: Settings guidance when permission denied

### Code Quality (9/9 Complete)

- [x] **QUAL-01**: Geolocation API existence checked
- [x] **QUAL-02**: Well save handler unmount guard
- [x] **QUAL-03**: LocationPickerBottomSheet coordinate validation
- [x] **QUAL-04**: Tile cache maxEntries increased
- [x] **QUAL-05**: meterSerialNumber optional
- [x] **QUAL-06**: AddWellFormBottomSheet coordinate range validation
- [x] **QUAL-07**: WellMarker useMemo removal
- [x] **QUAL-08**: LocationPermissionBanner ARIA role
- [x] **QUAL-09**: MapOfflineOverlay aria-label cleanup

## v2.0 Requirements

Requirements for meter reading, allocation tracking, and well management milestone.

### Well Detail

- [ ] **WELL-01**: User can tap a well marker on the map to open a full-page slide-up sheet (map stays loaded behind)
- [ ] **WELL-02**: Well detail sheet shows farm name, well name, serial number, WMIS #, and "Last Updated" timestamp
- [ ] **WELL-03**: Well detail sheet shows a visual usage gauge bar with Allocated / Used / Remaining for current allocation
- [ ] **WELL-04**: Well detail sheet shows status indicators (Pump, Battery, Meter Status) with check/X icons
- [x] **WELL-05**: Well detail sheet shows scrollable readings history (Date, Value, User, Time)
- [x] **WELL-06**: Out-of-range readings marked with yellow indicator in readings list
- [x] **WELL-07**: "Missing Allocation" message when well has no allocation periods
- [ ] **WELL-08**: Back button dismisses the sheet, returning to interactive map
- [ ] **WELL-09**: Edit button navigates to well edit form
- [ ] **WELL-10**: WellMarker on map shows real allocation percentage (not hardcoded 100%)
- [ ] **WELL-11**: Well list page shows latest reading date/time for each well

### Meter Readings

- [x] **READ-01**: User can record a new meter reading via "+ New Reading" button (raw cumulative value)
- [ ] **READ-02**: New reading form displays unit and multiplier (e.g., "GAL x 10.0")
- [x] **READ-03**: Reading captures GPS location automatically on submission
- [ ] **READ-04**: Similar reading warning (within 5 units of last reading) with Continue option
- [x] **READ-05**: Grower/admin can edit a reading value
- [x] **READ-06**: Grower/admin can delete a reading
- [x] **READ-07**: "No readings" empty state message when well has no readings

### Meter Problem

- [ ] **PROB-01**: User can report a meter problem via checkboxes (Not Working, Battery Dead, Pump Off, Dead Pump)
- [ ] **PROB-02**: Problem submission updates well status fields

### GPS Proximity

- [ ] **PROX-01**: "In Range / Out of Range" GPS indicator
- [x] **PROX-02**: Range status recorded with each reading

### Allocations

- [x] **ALLOC-01**: Create allocation period (start, end, allocated in AF)
- [x] **ALLOC-02**: View allocation periods table
- [x] **ALLOC-03**: Edit allocation (dates, used, allocated)
- [x] **ALLOC-04**: Delete allocation period
- [x] **ALLOC-05**: Usage auto-calculated from readings
- [x] **ALLOC-06**: Usage manually overridable

### Well Editing

- [ ] **EDIT-01**: Edit well details (name, serial, WMIS, coords, units, multiplier)
- [ ] **EDIT-02**: Allocation count with link to allocation management
- [ ] **EDIT-03**: Update equipment status from edit form

## Future Requirements

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
| Granular per-feature permissions | 4 simple roles sufficient |
| Self-service role change | Security risk. Farm owners control access |
| Email-based invites | Field workers check email infrequently. Phone SMS is correct channel |
| Password-based auth | Phone OTP only, no dual auth methods |
| Real-time invite codes | Phone-targeted invites give explicit control |
| Multi-farm membership | Premature complexity for current scale |
| Stripe payment | Need product validation first |
| 30D time period filter | Deferred -- show all readings for now |
| Toggle Unit display | Deferred |
| Monthly meter reading report | Deferred |
| Reading photos/attachments | Deferred |

## Traceability

### v1.0 Traceability (Complete)

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 1: Session Stability | Complete |
| AUTH-02 | Phase 1: Session Stability | Complete |
| AUTH-03 | Phase 1: Session Stability | Complete |
| AUTH-04 | Phase 2: Offline Session Resilience | Complete |
| AUTH-05 | Phase 2: Offline Session Resilience | Complete |
| AUTH-06 | Phase 2: Offline Session Resilience | Complete |
| ONBD-01 | Phase 5: Grower Onboarding | Complete |
| ONBD-02 | Phase 6: Invite System | Complete |
| ONBD-03 | Phase 6: Invite System | Complete |
| ONBD-04 | Phase 5: Grower Onboarding | Complete |
| ROLE-01 | Phase 3: Role Foundation | Complete |
| ROLE-02 | Phase 3: Role Foundation | Complete |
| ROLE-03 | Phase 3: Role Foundation | Complete |
| ROLE-04 | Phase 4: Permission Enforcement | Complete |
| ROLE-05 | Phase 4: Permission Enforcement | Complete |
| ROLE-06 | Phase 4: Permission Enforcement | Complete |
| ROLE-07 | Phase 4: Permission Enforcement | Complete |
| USER-01 | Phase 7: User Management | Complete |
| USER-02 | Phase 7: User Management | Complete |
| USER-03 | Phase 6: Invite System | Complete |
| USER-04 | Phase 6: Invite System | Complete |
| USER-05 | Phase 6: Invite System | Complete |
| USER-06 | Phase 7: User Management | Complete |
| USER-07 | Phase 7: User Management | Complete |
| USER-08 | Phase 7: User Management | Complete |
| SUBS-01 | Phase 8: Subscription Gating | Complete |
| SUBS-02 | Phase 8: Subscription Gating | Complete |
| SUBS-03 | Phase 8: Subscription Gating | Complete |

### v1.1 Traceability (Complete)

| Requirement | Phase | Status |
|-------------|-------|--------|
| MAP-01 | Phase 9: Map Default View | Complete |
| MAP-02 | Phase 9: Map Default View | Complete |
| MAP-03 | Phase 9: Map Default View | Complete |
| MAP-04 | Phase 9: Map Default View | Complete |
| LOC-01 | Phase 10: Location Permission Flow | Complete |
| LOC-02 | Phase 10: Location Permission Flow | Complete |
| LOC-03 | Phase 10: Location Permission Flow | Complete |
| LOC-04 | Phase 10: Location Permission Flow | Complete |
| QUAL-01 | Phase 11: Dashboard Quality Fixes | Complete |
| QUAL-02 | Phase 11: Dashboard Quality Fixes | Complete |
| QUAL-03 | Phase 11: Dashboard Quality Fixes | Complete |
| QUAL-04 | Phase 11: Dashboard Quality Fixes | Complete |
| QUAL-05 | Phase 11: Dashboard Quality Fixes | Complete |
| QUAL-06 | Phase 11: Dashboard Quality Fixes | Complete |
| QUAL-07 | Phase 11: Dashboard Quality Fixes | Complete |
| QUAL-08 | Phase 11: Dashboard Quality Fixes | Complete |
| QUAL-09 | Phase 11: Dashboard Quality Fixes | Complete |

### v2.0 Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| WELL-01 | Phase 13: Well Detail Page | Pending |
| WELL-02 | Phase 13: Well Detail Page | Pending |
| WELL-03 | Phase 13: Well Detail Page | Pending |
| WELL-04 | Phase 13: Well Detail Page | Pending |
| WELL-05 | Phase 13: Well Detail Page | Complete |
| WELL-06 | Phase 13: Well Detail Page | Complete |
| WELL-07 | Phase 13: Well Detail Page | Complete |
| WELL-08 | Phase 13: Well Detail Page | Pending |
| WELL-09 | Phase 13: Well Detail Page | Pending |
| WELL-10 | Phase 16: Reading Management & Map Integration | Pending |
| WELL-11 | Phase 16: Reading Management & Map Integration | Pending |
| READ-01 | Phase 14: Record Meter Reading | Complete |
| READ-02 | Phase 14: Record Meter Reading | Pending |
| READ-03 | Phase 14: Record Meter Reading | Complete |
| READ-04 | Phase 14: Record Meter Reading | Pending |
| READ-05 | Phase 16: Reading Management & Map Integration | Complete |
| READ-06 | Phase 16: Reading Management & Map Integration | Complete |
| READ-07 | Phase 13: Well Detail Page | Complete |
| PROB-01 | Phase 14: Record Meter Reading | Pending |
| PROB-02 | Phase 14: Record Meter Reading | Pending |
| PROX-01 | Phase 13: Well Detail Page | Pending |
| PROX-02 | Phase 14: Record Meter Reading | Complete |
| ALLOC-01 | Phase 15: Well Editing & Allocation Management | Complete |
| ALLOC-02 | Phase 15: Well Editing & Allocation Management | Complete |
| ALLOC-03 | Phase 15: Well Editing & Allocation Management | Complete |
| ALLOC-04 | Phase 15: Well Editing & Allocation Management | Complete |
| ALLOC-05 | Phase 15: Well Editing & Allocation Management | Complete |
| ALLOC-06 | Phase 15: Well Editing & Allocation Management | Complete |
| EDIT-01 | Phase 15: Well Editing & Allocation Management | Pending |
| EDIT-02 | Phase 15: Well Editing & Allocation Management | Pending |
| EDIT-03 | Phase 15: Well Editing & Allocation Management | Pending |

**v2.0 Coverage:**
- v2.0 requirements: 31 total
- Mapped to phases: 31
- Unmapped: 0

---
*Requirements defined: 2026-02-10*
*Last updated: 2026-02-19 after v2.0 roadmap creation*
