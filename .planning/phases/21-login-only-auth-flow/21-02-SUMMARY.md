# Plan 21-02: Frontend — Remove Onboarding, Simplify Auth — Execution Summary

**Executed:** 2026-02-22
**Status:** Complete

## What Was Done

### 1. Renamed OnboardingStatus -> AuthStatus (AUTH-07)
Global rename across 22 source files (~120 occurrences):
- `OnboardingStatus` -> `AuthStatus`
- `onboardingStatus` -> `authStatus`
- `setOnboardingStatus` -> `setAuthStatus`
- `isFetchingOnboarding` -> `isFetchingAuth`
- `refreshOnboardingStatus` -> `refreshAuthStatus`
- `fetchOnboardingStatus` -> `fetchAuthStatus`
- `ONBOARDING_CACHE_KEY` -> `AUTH_STATUS_CACHE_KEY`
- Removed `hasProfile` from `AuthStatus` interface (always true)

### 2. Created NoSubscriptionPage (AUTH-04)
- New file: `src/pages/NoSubscriptionPage.tsx`
- Uses `AuthLayout` (outside AppLayout/PowerSync)
- Fetches `subscription_website_url` via direct Supabase query
- Shows: NoSymbolIcon, heading, signed-in phone, conditional subscription link, Sign Out
- `visibilitychange` listener re-checks farm membership for auto-redirect

### 3. Simplified RequireOnboarded (AUTH-02)
- Removed `hasProfile` check (no longer in interface)
- Changed redirect from `/onboarding/farm/create` to `/no-subscription`

### 4. Simplified VerifyPage and PhonePage (AUTH-05)
- Removed `resolveNextRoute` import and usage
- Direct routing: `hasFarmMembership ? '/' : '/no-subscription'`

### 5. Updated App.tsx Routes (AUTH-01)
- Removed all onboarding routes (`/onboarding/*`)
- Removed legacy redirects (`/register`, `/setup`)
- Added `NoSubscriptionPage` inside `RequireAuth` but outside `RequireOnboarded`

### 6. Deleted Dead Files (AUTH-01, AUTH-07)
- `src/pages/onboarding/ProfilePage.tsx` (181 lines)
- `src/pages/onboarding/CreateFarmPage.tsx` (303 lines)
- `src/pages/onboarding/index.ts`
- `src/components/RequireNotOnboarded.tsx` (27 lines)
- `src/lib/resolveNextRoute.ts` (71 lines)

### 7. Created Shared Utility
- `src/lib/formatPhone.ts` — extracted duplicate `formatPhoneForDisplay` from VerifyPage and NoSubscriptionPage

### 8. Code Review Fixes
- Replaced local `formatPhoneForDisplay` with shared import in VerifyPage and NoSubscriptionPage
- Removed non-null assertion (`subscriptionUrl!` -> `subscriptionUrl ?? ''`)

## Verification
- `npx tsc -b --noEmit` — zero type errors
- Grep confirmed zero dead references to deleted files, onboarding routes, or registration routes
- Code reviewer agent ran on all modified files — all CRITICAL/WARNING issues resolved

## Requirement Coverage
- **AUTH-01**: All onboarding routes and pages removed
- **AUTH-02**: RequireOnboarded redirects to /no-subscription
- **AUTH-03**: powersync-connector.ts unchanged (no onboarding logic)
- **AUTH-04**: NoSubscriptionPage with subscription link, sign out, auto-redirect
- **AUTH-05**: Simplified auth pages with direct routing
- **AUTH-07**: Full rename OnboardingStatus -> AuthStatus
