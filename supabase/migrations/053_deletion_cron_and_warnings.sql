-- =============================================================================
-- Migration 053: Auto-delete expired farms + send deletion warning emails
-- =============================================================================
-- Two daily cron jobs:
-- 1. delete-expired-farms: Deletes farms where scheduled_delete_at <= NOW()
--    Runs daily at 2:00 AM UTC. Farm FK cascades handle related data cleanup.
--    Auth accounts are cleaned up via edge function call.
-- 2. send-deletion-warnings: Sends email warnings at 30 and 7 days before
--    scheduled deletion via send-deletion-warning edge function.
--    Runs daily at 9:00 AM UTC.
--
-- PREREQUISITE: Vault secrets 'project_url' and 'supabase_anon_key' must exist
-- (already created by migration 047 for send-monthly-report).
-- Also add RESEND_API_KEY in Supabase Dashboard > Edge Functions > Secrets
-- (may already exist from send-monthly-report setup).
-- =============================================================================

-- Enable required extensions (no-op if already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- =============================================================================
-- Job 1: delete-expired-farms (daily at 2:00 AM UTC)
-- =============================================================================
-- Calls the send-deletion-warning edge function with action 'delete_expired'.
-- The edge function handles:
--   1. Finding farms where scheduled_delete_at <= NOW()
--   2. Collecting member user_ids before deletion
--   3. Deleting the farm row (FK CASCADE handles wells, readings, allocations,
--      farm_members, farm_invites, report_email_recipients)
--   4. Deleting auth accounts for orphaned members
-- =============================================================================

-- Remove existing job if re-running (idempotent)
DO $$
BEGIN
  PERFORM cron.unschedule('delete-expired-farms');
EXCEPTION WHEN OTHERS THEN
  -- Job does not exist yet, ignore
END;
$$;

-- Daily at 2:00 AM UTC: Delete expired farms and clean up auth accounts
SELECT cron.schedule(
  'delete-expired-farms',
  '0 2 * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url')
           || '/functions/v1/send-deletion-warning',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_anon_key'),
      'apikey',        (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_anon_key')
    ),
    body := jsonb_build_object('action', 'delete_expired', 'source', 'pg_cron', 'triggered_at', now()),
    timeout_milliseconds := 120000
  ) AS request_id;
  $$
);

-- =============================================================================
-- Job 2: send-deletion-warnings (daily at 9:00 AM UTC)
-- =============================================================================
-- Calls the send-deletion-warning edge function with action 'send_warnings'.
-- The edge function handles:
--   1. Finding farms with scheduled_delete_at ~30 days from now
--   2. Finding farms with scheduled_delete_at ~7 days from now
--   3. Looking up farm owner email via farm_members + auth.admin
--   4. Sending warning emails via Resend API
-- =============================================================================

-- Remove existing job if re-running (idempotent)
DO $$
BEGIN
  PERFORM cron.unschedule('send-deletion-warnings');
EXCEPTION WHEN OTHERS THEN
  -- Job does not exist yet, ignore
END;
$$;

-- Daily at 9:00 AM UTC: Send email warnings at 30 and 7 days before deletion
SELECT cron.schedule(
  'send-deletion-warnings',
  '0 9 * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url')
           || '/functions/v1/send-deletion-warning',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_anon_key'),
      'apikey',        (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_anon_key')
    ),
    body := jsonb_build_object('action', 'send_warnings', 'source', 'pg_cron', 'triggered_at', now()),
    timeout_milliseconds := 120000
  ) AS request_id;
  $$
);
