---
phase: 44-farm-subscription-cancellation-lifecycle-with-read-only-retention-and-auto-deletion
plan: 03
subsystem: database, infra
tags: [pg_cron, pg_net, supabase-edge-functions, resend, email, deno, farm-deletion, data-retention]

# Dependency graph
requires:
  - phase: 44-01
    provides: "canceled_at and scheduled_delete_at columns on farms, is_farm_read_only() helper, read-only RLS enforcement"
  - phase: 47 (migration 047)
    provides: "pg_cron/pg_net pattern, vault secrets (project_url, supabase_anon_key)"
provides:
  - "Daily pg_cron job (2 AM UTC) that deletes expired farms via edge function with auth account cleanup"
  - "Daily pg_cron job (9 AM UTC) that sends 30-day and 7-day warning emails to farm owners"
  - "send-deletion-warning edge function handling both deletion and email warning actions"
affects: [subscription-lifecycle, farm-management, data-retention]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Multi-action edge function dispatching on body.action field from pg_cron"
    - "Auth account cleanup after farm deletion (check for orphaned members)"
    - "Date-window email warning system (30-day and 7-day windows)"

key-files:
  created:
    - supabase/migrations/053_deletion_cron_and_warnings.sql
    - supabase/functions/send-deletion-warning/index.ts
  modified: []

key-decisions:
  - "Edge function handles both deletion and warnings via action dispatch (simpler than separate functions)"
  - "Auth accounts only deleted for users with no remaining farm memberships (prevents deleting shared users)"
  - "Date windows use full UTC day range (00:00:00 to 23:59:59) to catch all farms regardless of exact time"

patterns-established:
  - "Multi-action cron-triggered edge function: single endpoint, action field dispatch, dual pg_cron callers"
  - "Orphaned auth cleanup: collect member IDs before cascade delete, check for other memberships, then delete auth"

requirements-completed: [CANCEL-06, CANCEL-07]

# Metrics
duration: 3min
completed: 2026-03-18
---

# Phase 44 Plan 03: Deletion Cron and Warning Emails Summary

**Daily pg_cron jobs for auto-deleting expired farms (with auth cleanup) and sending 30/7-day warning emails to farm owners via Resend**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-18T03:08:42Z
- **Completed:** 2026-03-18T03:12:05Z
- **Tasks:** 2
- **Files created:** 2

## Accomplishments
- Migration 053 schedules two daily pg_cron jobs: delete-expired-farms (2 AM UTC) and send-deletion-warnings (9 AM UTC)
- Edge function deleteExpiredFarms deletes farms past scheduled_delete_at, cascades related data via FK, and cleans up orphaned auth accounts
- Edge function sendDeletionWarnings sends styled HTML warning emails at 30-day and 7-day windows with URGENT labeling for 7-day warnings
- Both pg_cron jobs call the same edge function with different action parameters, reusing vault secrets from migration 047

## Task Commits

Each task was committed atomically:

1. **Task 1: Migration 053 -- Daily pg_cron farm deletion job + email warning job** - `a5f0f76` (feat)
2. **Task 2: send-deletion-warning edge function for farm deletion and email warnings** - `883f4a5` (feat)

## Files Created/Modified
- `supabase/migrations/053_deletion_cron_and_warnings.sql` - Two pg_cron jobs: delete-expired-farms (2 AM UTC) and send-deletion-warnings (9 AM UTC), both calling send-deletion-warning edge function via net.http_post
- `supabase/functions/send-deletion-warning/index.ts` - Deno edge function with deleteExpiredFarms (farm deletion + auth cleanup) and sendDeletionWarnings (30/7-day email warnings via Resend)

## Decisions Made
- Edge function handles both deletion and warnings via action dispatch -- simpler than maintaining two separate edge functions, and both actions share the same Supabase admin client pattern
- Auth accounts only deleted for users with no remaining farm memberships -- prevents accidentally deleting users who belong to multiple farms
- Date windows use full UTC day range (00:00:00 to 23:59:59) to ensure no farms are missed regardless of exact scheduled_delete_at time
- Styled HTML email template with urgency-colored header (red for 7-day, amber for 30-day) and green renew button matching app theme

## Deviations from Plan

None - plan executed exactly as written.

## User Setup Required

**External services require manual configuration:**
- **RESEND_API_KEY**: Must be set as Supabase Edge Function secret (may already exist from send-monthly-report)
- **DELETION_WARNING_FROM_EMAIL** (optional): Override default from-email address (defaults to noreply@agwatertracker.com)
- **APP_URL** (optional): Override app URL for renew subscription link (defaults to https://app.agwatertracker.com)
- **Deploy**: `npx supabase functions deploy send-deletion-warning --no-verify-jwt`

## Next Phase Readiness
- All three plans in Phase 44 are now complete
- Farm subscription cancellation lifecycle is fully implemented: RLS enforcement (Plan 01), frontend read-only hooks/banners (Plan 02), and auto-deletion with email warnings (Plan 03)
- Pending manual step: Deploy send-deletion-warning edge function

## Self-Check: PASSED

All files and commits verified:
- supabase/migrations/053_deletion_cron_and_warnings.sql: FOUND
- supabase/functions/send-deletion-warning/index.ts: FOUND
- 44-03-SUMMARY.md: FOUND
- Commit a5f0f76: FOUND
- Commit 883f4a5: FOUND

---
*Phase: 44-farm-subscription-cancellation-lifecycle-with-read-only-retention-and-auto-deletion*
*Completed: 2026-03-18*
