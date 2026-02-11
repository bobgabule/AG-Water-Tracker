# Phase 4: Permission Enforcement — UAT

## Success Criteria Tests

| # | Criterion | Status | Notes |
|---|-----------|--------|-------|
| 1 | Meter checker cannot see Subscription nav, Settings farm management, or "Invite User" button | - | |
| 2 | Grower and admin can see and access all management features within their own farm | - | |
| 3 | Super admin can navigate to any farm and see its wells, members, and settings | - | |
| 4 | Unauthorized route access redirects to dashboard with no error | - | |
| 5 | Role change on server triggers local data refresh and UI update on next sync | - | |

## Additional Checks

| # | Check | Status | Notes |
|---|-------|--------|-------|
| A | Meter checker cannot see New Well buttons on dashboard or well list | - | |
| B | Meter checker long-pressing map does NOT open well creation form | - | |
| C | FarmSelector only visible to super_admin in header | - | |
| D | Sign-out clears active farm override (no stale state for next user) | - | |

## Test Results

(filled in during testing)
