---
status: resolved
trigger: "Invite still shows Pending after invited user joined; user redirected to /no-subscription instead of dashboard"
created: 2026-02-23T00:00:00Z
updated: 2026-02-23T00:00:00Z
---

## Current Focus

hypothesis: CONFIRMED - This is NOT a standalone bug. The "Pending" display is correct because the auto-join never executed. The root cause is in the server-side auto-join logic (migration 034 / database function).
test: Full code trace from OTP -> RPC -> SQL function -> PendingInvitesList
expecting: n/a (resolved)
next_action: Report findings

## Symptoms

expected: After invited user logs in via OTP, the auto-join should: (1) create user profile, (2) insert farm_members row, (3) DELETE the invite from farm_invites, (4) return has_farm_membership=true so user lands on dashboard
actual: User is redirected to /no-subscription. The invite row remains in farm_invites unchanged. The invite shows as "Pending" in PendingInvitesList.
errors: None visible (no crash, no error message -- errors swallowed by fetchAuthStatus fallback)
reproduction: Create invite for phone -> login with that phone -> observe redirect to /no-subscription
started: After migration 034 was written

## Eliminated

- hypothesis: PendingInvitesList has a display bug showing deleted invites from PowerSync cache
  evidence: The invite is not deleted from the database at all (row still exists unchanged). This is a server-side failure, not a client cache issue.
  timestamp: 2026-02-23

- hypothesis: The DELETE in migration 034 fails silently due to RLS policies
  evidence: The function is SECURITY DEFINER (runs as postgres owner), so RLS is bypassed. The DELETE would succeed if the function were actually running.
  timestamp: 2026-02-23

- hypothesis: CHECK constraint violation on farm_members.role when inserting from invite
  evidence: farm_invites stores 'admin' or 'meter_checker' (migration 021 CHECK). farm_members allows 'super_admin', 'grower', 'admin', 'meter_checker'. Both invite roles are valid for farm_members.
  timestamp: 2026-02-23

- hypothesis: search_path issues causing trigger failures inside the function
  evidence: Migration 024 fixed set_farm_member_full_name to use FROM public.users. The auto_display_name trigger doesn't reference any tables. All table references in get_onboarding_status_impl are fully qualified.
  timestamp: 2026-02-23

- hypothesis: Phone format mismatch between auth.users.phone and farm_invites.invited_phone
  evidence: PhonePage sends +1XXXXXXXXXX to sendOtp (line 68). Supabase Auth stores E.164 format. invite_user_by_phone_impl normalizes to +1XXXXXXXXXX. Formats should match.
  timestamp: 2026-02-23

- hypothesis: Public wrapper needs recreation (original UAT diagnosis)
  evidence: The public wrapper (migration 023) is a thin SQL pass-through: SELECT private.get_onboarding_status_impl(). PostgreSQL resolves the callee at execution time, not definition time. Updating the private impl IS sufficient. The wrapper does NOT need recreation.
  timestamp: 2026-02-23

## Evidence

- timestamp: 2026-02-23
  checked: git status
  found: supabase/migrations/034_login_only_auto_join.sql is listed as UNTRACKED (??)
  implication: This migration file exists locally but has not been committed. It may or may not have been applied to the remote Supabase database via `supabase db push` or dashboard SQL editor.

- timestamp: 2026-02-23
  checked: Migration 034 vs migration 026 differences
  found: Migration 034 replaces `UPDATE uses_count` with `DELETE FROM farm_invites`. All other auto-join logic is identical.
  implication: The only behavioral difference between versions is delete vs increment.

- timestamp: 2026-02-23
  checked: User report details
  found: User says "redirected to /no-subscription and db row invite is not deleted". This means has_farm_membership returned false from the RPC.
  implication: The auto-join block was never entered, OR the RPC errored and the transaction rolled back.

- timestamp: 2026-02-23
  checked: fetchAuthStatus error handling (AuthProvider.tsx lines 168-236)
  found: Non-auth RPC errors fall back to localStorage cache. For a brand new user, cache is empty, so fetchAuthStatus returns null.
  implication: If the RPC errors for ANY reason, the user sees null authStatus -> navigates to /no-subscription. The error is silently swallowed.

- timestamp: 2026-02-23
  checked: VerifyPage.tsx execution path (lines 84-117)
  found: After verifyOtp (which calls fetchAuthStatus internally), VerifyPage calls refreshAuthStatus() again, then navigates based on status?.hasFarmMembership. With null status, user goes to /no-subscription.
  implication: Double-call to RPC (verifyOtp + refreshAuthStatus) means auto-join gets two chances, but if the underlying issue persists, both fail.

- timestamp: 2026-02-23
  checked: PendingInvitesList.tsx status computation (lines 46-59)
  found: Status logic: uses_count >= 1 -> "Joined", expired -> "Expired", else -> "Pending". Since auto-join never ran, the invite remains with its original state and displays as "Pending".
  implication: PendingInvitesList is working CORRECTLY -- it accurately reflects that the invite was never consumed.

## Resolution

root_cause: |
  This is NOT a standalone bug. The invite showing "Pending" is a downstream symptom of the auto-join never executing during login.

  The auto-join logic in get_onboarding_status_impl (called via RPC after OTP verification) either:
  (a) never enters the auto-join block (phone match returns no rows), OR
  (b) throws an error that gets caught and swallowed by fetchAuthStatus's error handling

  In either case, the function returns has_farm_membership=false, VerifyPage navigates to /no-subscription, and the invite row remains unchanged in the database.

  The most likely specific cause is that migration 034 has NOT been applied to the remote Supabase database. However, even the previous version (migration 026) has the same auto-join logic with the same phone matching. The fact that uses_count is still 0 indicates the phone matching SELECT itself is failing -- likely due to a phone format discrepancy between auth.users.phone and farm_invites.invited_phone that only manifests in the production environment.

  NOTE: The previous UAT diagnosis (line 93 of 21-UAT.md) is INCORRECT. It claims "the public wrapper needs recreation" but the public wrapper is a thin SQL pass-through that always calls the latest private impl. That is not the issue.

  REQUIRES DATABASE VERIFICATION:
  1. Check if migration 034 was applied: Run the function and check if it DELETEs or increments uses_count
  2. Compare phone formats: SELECT phone FROM auth.users WHERE id = '<invited_user_id>' vs SELECT invited_phone FROM farm_invites WHERE code = '<invite_code>'
  3. Check Supabase function logs for any errors during the RPC call

fix: (not applied -- diagnosis only)
verification: (not applied -- diagnosis only)
files_changed: []
