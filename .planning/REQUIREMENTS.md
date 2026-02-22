# Requirements: AG Water Tracker

**Defined:** 2026-02-22
**Core Value:** Field agents can reliably record water meter readings offline, and data syncs automatically when online

## v3.0 Requirements

Requirements for v3.0 Subscriptions & Permissions. Each maps to roadmap phases.

### Subscription Tiers

- [x] **TIER-01**: `subscription_tiers` table in Supabase with per-role seat limits and well limits per tier (Starter: 5 wells, 1 admin, 1 meter checker | Pro: 10 wells, 1 admin, 3 meter checkers)
- [x] **TIER-02**: `app_settings` table in Supabase for global key-value config (subscription website URL, support email)
- [x] **TIER-03**: `farms.subscription_tier` column linking each farm to a tier (no default, existing farms backfilled to 'pro')
- [x] **TIER-04**: PowerSync global bucket sync for subscription_tiers and app_settings (available offline)
- [x] **TIER-05**: `useSubscriptionTier()` hook replacing hardcoded `PLAN_LIMITS` in `src/lib/subscription.ts`
- [ ] **TIER-06**: Well count enforcement — disable "New Well" button at tier limit (Basic: 5, Pro: 10)
- [ ] **TIER-07**: Seat limit enforcement reads from DB-driven tier config instead of hardcoded constants
- [ ] **TIER-08**: Subscription page shows current tier, usage per role, well count, and "Manage Plan" placeholder

### Auth Flow

- [ ] **AUTH-01**: Remove ProfilePage, CreateFarmPage, and `/onboarding/*` routes from app
- [ ] **AUTH-02**: Remove RequireNotOnboarded guard and all onboarding status logic from connector
- [ ] **AUTH-03**: Clean up supabaseConnector — remove onboarding flows, simplify to login-only path
- [ ] **AUTH-04**: "No subscription" page for users without farm membership with redirect to subscription website URL (from app_settings)
- [ ] **AUTH-05**: Invited users auto-matched on login go straight to dashboard (no profile step)
- [ ] **AUTH-06**: Move invite auto-matching logic to backend RPC (decouple from removed onboarding pages)
- [ ] **AUTH-07**: Remove all dead imports, unused hooks, and orphaned utilities from old onboarding flow

### Role Permissions

- [x] **PERM-01**: Well edit/delete gated to grower and admin only (WellEditPage route guard + WellDetailHeader)
- [x] **PERM-02**: Allocation management gated to grower and admin only (WellAllocationsPage route guard)
- [ ] **PERM-03**: Well detail edit button hidden for meter checkers
- [x] **PERM-04**: Extend permission matrix in `permissions.ts` with fine-grained actions (edit_well, delete_well, manage_allocations)

### Farm Data Isolation

- [ ] **ISO-01**: Verify RLS policies filter wells, readings, allocations, members by farm_id
- [ ] **ISO-02**: Verify PowerSync sync rules filter all data tables by farm_id
- [ ] **ISO-03**: Verify super_admin cross-farm bypass is consistent across all tables and sync rules

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

## Out of Scope

| Feature | Reason |
|---------|--------|
| Stripe payment processing | Deferred to landing page milestone |
| Landing page / marketing site | Separate project, future milestone |
| Automatic reporting implementation | Listed as tier feature, built later |
| In-app tier upgrade/downgrade | Handled by Stripe Customer Portal (future) |
| Push notifications | Not needed for current scale |
| Real-time chat | Out of scope for this product |
| Email-based auth | Phone OTP only |
| Multi-farm membership | One user per farm |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| TIER-01 | Phase 17 | Complete |
| TIER-02 | Phase 17 | Complete |
| TIER-03 | Phase 17 | Complete |
| TIER-04 | Phase 18 | Complete |
| TIER-05 | Phase 18 | Complete |
| TIER-06 | Phase 20 | Pending |
| TIER-07 | Phase 20 | Pending |
| TIER-08 | Phase 20 | Pending |
| AUTH-01 | Phase 21 | Pending |
| AUTH-02 | Phase 21 | Pending |
| AUTH-03 | Phase 21 | Pending |
| AUTH-04 | Phase 21 | Pending |
| AUTH-05 | Phase 21 | Pending |
| AUTH-06 | Phase 21 | Pending |
| AUTH-07 | Phase 21 | Pending |
| PERM-01 | Phase 19 | Complete |
| PERM-02 | Phase 19 | Complete |
| PERM-03 | Phase 19 | Pending |
| PERM-04 | Phase 19 | Complete |
| ISO-01 | Phase 22 | Pending |
| ISO-02 | Phase 22 | Pending |
| ISO-03 | Phase 22 | Pending |

**Coverage:**
- v3.0 requirements: 22 total
- Mapped to phases: 22
- Unmapped: 0

---
*Requirements defined: 2026-02-22*
*Last updated: 2026-02-22 after roadmap creation*
