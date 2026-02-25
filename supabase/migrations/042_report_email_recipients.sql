-- Migration 042: Report Email Recipients + drop send_monthly_report
-- Creates table for storing per-farm email recipient lists for automated monthly reports.
-- Also drops the unused send_monthly_report column from wells.

-- Drop unused column from wells (reports now always include all wells)
ALTER TABLE public.wells DROP COLUMN IF EXISTS send_monthly_report;

-- Create report_email_recipients table
CREATE TABLE public.report_email_recipients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    is_auto_added BOOLEAN NOT NULL DEFAULT FALSE,
    source_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(farm_id, email)
);

-- Index for farm-scoped queries
CREATE INDEX idx_report_email_recipients_farm_id ON public.report_email_recipients(farm_id);

-- Auto-update updated_at timestamp
CREATE TRIGGER update_report_email_recipients_updated_at
    BEFORE UPDATE ON public.report_email_recipients
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security
ALTER TABLE public.report_email_recipients ENABLE ROW LEVEL SECURITY;

-- Any farm member can view report recipients
CREATE POLICY "Members can view report recipients"
    ON public.report_email_recipients FOR SELECT
    USING (farm_id IN (SELECT farm_id FROM public.farm_members WHERE user_id = auth.uid()));

-- Grower/admin can insert report recipients
CREATE POLICY "Admins can insert report recipients"
    ON public.report_email_recipients FOR INSERT
    WITH CHECK (farm_id IN (SELECT get_user_admin_farm_ids()));

-- Grower/admin can update report recipients
CREATE POLICY "Admins can update report recipients"
    ON public.report_email_recipients FOR UPDATE
    USING (farm_id IN (SELECT get_user_admin_farm_ids()))
    WITH CHECK (farm_id IN (SELECT get_user_admin_farm_ids()));

-- Grower/admin can delete report recipients
CREATE POLICY "Admins can delete report recipients"
    ON public.report_email_recipients FOR DELETE
    USING (farm_id IN (SELECT get_user_admin_farm_ids()));

-- Grant access to authenticated users (PostgREST requirement)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.report_email_recipients TO authenticated;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
