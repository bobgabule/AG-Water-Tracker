# Plan 06-01 Summary: First/Last Name Support + Auto-Profile Fix

## Status: Complete

## Changes Made

### New Files
- `supabase/migrations/026_invite_first_last_name.sql` — Migration with schema changes, RPC updates, grants

### Modified Files
- `src/components/AddUserModal.tsx` — Split single Name input into First Name + Last Name (2-column grid)
- `src/components/PendingInvitesList.tsx` — Updated interface, SQL query, display to use new columns
- `src/lib/powersync-schema.ts` — Replaced `invited_name` with `invited_first_name` + `invited_last_name`
- `docs/powersync-sync-rules.yaml` — Updated all 3 farm_invites bucket queries + user_profile query

### Database Changes (Migration 026)
1. Added `invited_first_name TEXT` and `invited_last_name TEXT` to `farm_invites`
2. Migrated existing data (split on space)
3. Dropped `invited_name` column
4. Updated `private.invite_user_by_phone_impl` — new 5-param signature
5. Updated `private.get_onboarding_status_impl` — auto-creates profile with `first_name, last_name` (trigger handles `display_name`)
6. Dropped and recreated `public.invite_user_by_phone` wrapper with new signature
7. Re-granted permissions, reloaded PostgREST schema

## Verification
- TypeScript: `npx tsc -b --noEmit` — zero errors
- Build: `npx vite build` — clean production build
- No remaining references to `invited_name` or `p_name` in src/
- Code review: addressed WARNING about name splitting in migration data migration
