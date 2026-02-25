# Plan 21-01: Backend Auto-Join RPC Update — Execution Summary

**Executed:** 2026-02-22
**Status:** Complete

## What Was Done

### Migration 034: Login-Only Auto-Join
- Created `supabase/migrations/034_login_only_auto_join.sql`
- Single change to `get_onboarding_status_impl`: invite matching now DELETEs the invite row instead of incrementing `uses_count`
- Full `CREATE OR REPLACE FUNCTION` copied from migration 026 with one line changed
- Includes `GRANT EXECUTE` and `NOTIFY pgrst, 'reload schema'`

## Requirement Coverage
- **AUTH-06**: Invite is deleted after successful auto-join (no audit trail, no reuse)
