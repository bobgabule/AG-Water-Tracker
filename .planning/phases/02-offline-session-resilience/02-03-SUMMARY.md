# Plan 02-03 Summary: Auth Error Detection in fetchOnboardingStatus

**Status**: Complete
**Duration**: ~5 min

## What Was Done

### Task 1: Detect auth errors and trigger immediate session expiry

Added auth error detection in `fetchOnboardingStatus` to bypass cache fallback for revoked sessions:

1. **Added `isAuthRpcError` helper** (lines 21-35):
   - Accepts `unknown` type with proper type guard
   - Detects PGRST301 (PostgREST JWT expired) and 401 error codes
   - Detects specific JWT error messages: "jwt expired", "invalid jwt", "invalid claim"
   - Tightened pattern matching per code review to avoid false positives

2. **Modified error branch** (lines 106-115):
   - Auth errors trigger `setSessionExpired(true)` + clear session/user/onboarding state
   - Clears stale onboarding cache to prevent masking on retry
   - Non-auth errors still fall back to cache (existing behavior preserved)

3. **Modified catch branch** (lines 150-159):
   - Same auth error detection for thrown errors
   - Same state clearing and cache removal pattern

## Files Modified

| File | Changes |
|------|---------|
| [src/lib/AuthProvider.tsx](src/lib/AuthProvider.tsx) | Added `isAuthRpcError` helper, auth error detection in both error paths |

## Verification

- `npx tsc -b --noEmit`: zero errors
- `isAuthRpcError` function defined and used in 2 places
- `setSessionExpired(true)` appears 3 times (2 new + SIGNED_OUT handler)
- Cache fallback preserved for non-auth errors (2 occurrences)
- `removeItem(ONBOARDING_CACHE_KEY)` appears 3 times (2 new + signOut)

## Code Review

Addressed CRITICAL issues:
- Fixed type safety: `isAuthRpcError` now accepts `unknown` with proper type guard
- Tightened pattern matching: removed overly broad "token" and "expired" checks

## What's Next

Phase 2 gap closure complete. Ready for Phase 4 (Permission Enforcement) or Phase 5 (Grower Onboarding).
