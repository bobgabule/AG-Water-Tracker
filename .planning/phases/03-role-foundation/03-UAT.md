---
status: testing
phase: 03-role-foundation
source: [03-01-SUMMARY.md, 03-02-SUMMARY.md, 03-03-SUMMARY.md, 03-04-SUMMARY.md]
started: 2026-02-10T09:00:00Z
updated: 2026-02-10T09:00:00Z
---

## Current Test

number: 2
name: Settings page role badge shows "Grower"
expected: |
  Open the app and navigate to Settings. In the Account section, your role badge should display "Grower" (not "owner") with a green color.
awaiting: user response

## Tests

### 1. Apply database migration 021
expected: Run migration 021_four_role_system.sql against your Supabase database (via SQL Editor or `supabase db push`). Migration completes without errors. Your existing farm_members row should now have role = 'grower' (was 'owner').
result: pass

### 2. Settings page role badge shows "Grower"
expected: Open the app and navigate to Settings. In the Account section, your role badge should display "Grower" (not "owner") with a green color (bg-green-500/20 text-green-400).
result: [pending]

### 3. Team Management section visible
expected: On the Settings page, you should see a "Team Management" section (since you're a grower). This section should include the ability to invite users / manage team.
result: [pending]

### 4. Add User modal shows Meter Checker role
expected: Open the Add User / Invite User modal. The role toggle should show "Admin" and "Meter Checker" options (NOT "Member"). The default selection should be "Meter Checker". The description should say "Meter checkers can view wells and record readings".
result: [pending]

### 5. JWT contains role and farm_id claims
expected: After logging out and back in, decode your JWT token (DevTools -> Application -> Local Storage -> sb-*-auth-token -> access_token at jwt.io). The app_metadata should contain "user_role": "grower" and "farm_id": "your-farm-uuid".
result: [pending]

## Summary

total: 5
passed: 1
issues: 0
pending: 4
skipped: 0

## Gaps

[none yet]
