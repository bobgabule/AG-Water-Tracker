---
status: complete
phase: 02-offline-session-resilience
source: [02-01-SUMMARY.md, 02-02-SUMMARY.md]
started: 2026-02-10T12:00:00Z
updated: 2026-02-10T12:25:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Offline Dashboard Access
expected: Previously logged-in user opens the app while offline and sees their dashboard with cached wells and map — no "Something went wrong" retry screen, no infinite spinner.
result: pass

### 2. Session Expired Messaging (Revoked Account)
expected: A user whose account/token has been revoked sees "Your session has expired. Please sign in again." with a Sign In button when connectivity returns and token refresh fails — not a silent redirect.
result: issue
reported: "After deleting auth.sessions from Supabase and reloading, shows 'Taking longer than usual...' spinner then 'Something went wrong / We couldn't load your account info / Tap to try again' instead of the session expired message. The onboarding retry screen catches the failure before the auth layer detects the session revocation."
severity: major

### 3. Normal Sign-Out (No Expired Message)
expected: When a user taps Sign Out normally, they are redirected to the phone/login page with no "session expired" message showing.
result: pass

### 4. Offline OTP Submission Block
expected: On the Phone page, attempting to submit a phone number while offline shows "No internet connection. Connect to the internet to sign in." instead of a cryptic error or spinner.
result: pass

### 5. Offline OTP Verification Block
expected: On the Verify page, attempting to verify OTP or resend code while offline shows a clear "no internet" connectivity error message instead of a cryptic error.
result: pass

## Summary

total: 5
passed: 4
issues: 1
pending: 0
skipped: 0

## Gaps

- truth: "User whose account has been revoked sees 'Your session has expired. Please sign in again.' with a Sign In button when token refresh fails"
  status: failed
  reason: "User reported: Shows 'Something went wrong / We couldn't load your account info' retry screen instead of session expired UI. Onboarding RPC failure caught before auth layer detects session revocation."
  severity: major
  test: 2
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""
