---
status: diagnosed
phase: 06-invite-system
source: 06-01-SUMMARY.md, 06-02-SUMMARY.md
started: 2026-02-23T00:00:00Z
updated: 2026-02-23T01:00:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Add User Modal — First/Last Name Fields
expected: Settings > Add User shows separate First Name and Last Name inputs in a 2-column grid layout (not a single "Name" field).
result: pass

### 2. Create an Invite
expected: Fill in phone, first name, last name, select role, tap Send Invite. Success message appears. Invite shows in Pending Invites list with the first/last name displayed.
result: issue
reported: "SMS could not be sent. Please notify the user manually. Invite is in the DB though."
severity: major

### 3. Invited User Joins via Phone OTP
expected: New user enters the invited phone number, completes OTP. Lands on the app with a profile that has the correct first name and last name pre-populated.
result: pass (after fix)
fix: Migration 037 — phone format normalization (Supabase Auth stores without '+', invites store with '+')

### 4. Invite Status Updates After Join
expected: After the invited user joins, the Pending Invites list updates — invite shows as "Joined" or is removed from pending.
result: pass (after fix)
fix: Downstream of test 3 fix — auto-join now DELETEs invite from farm_invites

### 5. AddWellFormBottomSheet Green Theme
expected: The Add Well form uses a green color theme (#5f7248), white labels, and consistent button styling.
result: pass

## Summary

total: 5
passed: 4
issues: 1
pending: 0
skipped: 0

## Gaps

- truth: "SMS invite is sent to the invited phone number"
  status: resolved
  reason: "Twilio upgraded to paid account — SMS now sends to any US number without verified-number restriction."
  severity: major
  test: 2
  root_cause: "Edge function send-invite-sms was not deployed. Now deployed. Twilio trial account restricted to verified numbers — resolved by upgrading to paid account."
  resolution: "Upgraded Twilio to paid account, purchased US phone number, enabled US geo permissions, updated Supabase secrets."

## Fixes Applied

- **Migration 037** (`supabase/migrations/037_fix_phone_format_matching.sql`): Normalizes auth.users.phone to E.164 format (adds '+' prefix) before matching against farm_invites.invited_phone. Root cause: Supabase Auth stores phone as '18029624008' but invites store as '+18029624008'.
- **Migrations 029-036**: Applied all pending migrations to remote Supabase (were local-only).
- **Edge function deployed**: send-invite-sms deployed to Supabase with Twilio secrets.
