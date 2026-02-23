---
status: diagnosed
phase: 21-login-only-auth-flow
source: 21-01-SUMMARY.md, 21-02-SUMMARY.md
started: 2026-02-23T00:00:00Z
updated: 2026-02-23T00:00:00Z
---

## Current Test
<!-- OVERWRITE each test - shows where we are -->

[testing complete]

## Tests

### 1. Phone Login → Dashboard
expected: Enter phone number on login page, receive OTP code, enter code on verify page → user with farm membership lands on the dashboard (/).
result: pass

### 2. Login Without Farm → No-Subscription Page
expected: A user whose phone number has no farm membership, after OTP verification, is redirected to /no-subscription (not an onboarding page).
result: pass

### 3. No-Subscription Page Content
expected: The /no-subscription page displays a "No Active Subscription" heading, your signed-in phone number (formatted), a "Subscribe" link to the subscription website (if configured in app_settings), and a "Sign Out" button.
result: pass

### 4. Sign Out from No-Subscription Page
expected: Clicking "Sign Out" on the no-subscription page logs you out and returns to the phone login screen.
result: issue
reported: "it does log out but takes too long"
severity: minor

### 5. Auto-Redirect After Farm Join
expected: While on the /no-subscription page, if another admin adds you to a farm, switching back to the app tab auto-redirects you to the dashboard.
result: issue
reported: "stuck at /no-subscription"
severity: major

### 6. Onboarding Routes Removed
expected: Navigating to /onboarding, /register, or /setup does NOT show any pages — these routes no longer exist and should redirect or show the default route.
result: pass

### 7. Invite Auto-Join on Login
expected: If a pending invite exists for your phone number, logging in automatically joins you to that farm. The invite row is deleted (no reuse). You land on the dashboard, not the no-subscription page.
result: issue
reported: "when the user logs in they are redirected to /no-subscription and db row invite is not deleted"
severity: blocker

## Summary

total: 7
passed: 4
issues: 3
pending: 0
skipped: 0

## Gaps

- truth: "Sign out from NoSubscriptionPage completes quickly"
  status: failed
  reason: "User reported: it does log out but takes too long"
  severity: minor
  test: 4
  root_cause: "signOut() in AuthProvider sequentially awaits disconnectAndClear() (PowerSync) with no timeout. NoSubscriptionPage is outside PowerSync provider, so disconnect operates on uninitialized/stale instance."
  artifacts:
    - path: "src/lib/AuthProvider.tsx"
      issue: "disconnectAndClear() awaited without timeout in signOut()"
  missing:
    - "Add timeout guard around disconnectAndClear() or skip it when PowerSync is not initialized"
  debug_session: ""

- truth: "Auto-redirect from /no-subscription to dashboard when user gets added to a farm"
  status: failed
  reason: "User reported: stuck at /no-subscription"
  severity: major
  test: 5
  root_cause: "visibilitychange handler calls navigate('/') before React state update propagates. RequireOnboarded sees stale authStatus and redirects back to /no-subscription."
  artifacts:
    - path: "src/pages/NoSubscriptionPage.tsx"
      issue: "visibilitychange handler navigates before context state propagates"
    - path: "src/components/RequireOnboarded.tsx"
      issue: "sees stale authStatus during route transition"
  missing:
    - "Remove navigate from visibilitychange handler; rely on the authStatus effect to handle redirect after state updates"
  debug_session: ""

- truth: "Invite auto-join on login: user with pending invite joins farm, invite deleted, lands on dashboard"
  status: failed
  reason: "User reported: when the user logs in they are redirected to /no-subscription and db row invite is not deleted"
  severity: blocker
  test: 7
  root_cause: "Migration 034 only updates private.get_onboarding_status_impl() but never recreates the public wrapper get_onboarding_status(). The RPC call hits the OLD function from migration 016 which has no phone-invite matching logic."
  artifacts:
    - path: "supabase/migrations/034_login_only_auto_join.sql"
      issue: "Missing public wrapper function creation — only updates private impl"
  missing:
    - "Add CREATE OR REPLACE FUNCTION public.get_onboarding_status() delegating to private.get_onboarding_status_impl()"
    - "Grant execute permissions and reload PostgREST schema cache"
  debug_session: ""
