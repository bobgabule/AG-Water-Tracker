-- =============================================================================
-- Migration 047: Schedule monthly report emails via pg_cron + pg_net
-- =============================================================================
-- Fires on the 15th of every month at 8:00 AM UTC.
-- Calls send-monthly-report edge function with no farmId (batch mode).
--
-- PREREQUISITE: Run these Vault secrets manually in the Supabase SQL Editor:
--
--   SELECT vault.create_secret(
--     'https://<YOUR_PROJECT_REF>.supabase.co',
--     'project_url'
--   );
--
--   SELECT vault.create_secret(
--     '<YOUR_ANON_KEY>',
--     'supabase_anon_key'
--   );
--
-- Also add RESEND_API_KEY in Supabase Dashboard > Edge Functions > Secrets.
-- =============================================================================

-- Enable required extensions (no-op if already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Remove existing job if re-running migration (idempotent)
DO $$
BEGIN
  PERFORM cron.unschedule('send-monthly-reports');
EXCEPTION WHEN OTHERS THEN
  -- Job does not exist yet, ignore
END;
$$;

-- Schedule: 15th of every month at 8:00 AM UTC
SELECT cron.schedule(
  'send-monthly-reports',
  '0 8 15 * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url')
           || '/functions/v1/send-monthly-report',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_anon_key'),
      'apikey',        (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_anon_key')
    ),
    body := jsonb_build_object('source', 'pg_cron', 'triggered_at', now()),
    timeout_milliseconds := 120000
  ) AS request_id;
  $$
);
