-- Migration 049: Add Stripe subscription columns to farms table
-- Links each farm to a Stripe Customer + Subscription for billing management

-- Stripe Customer ID (cus_xxx) — nullable for farms not yet on Stripe
ALTER TABLE public.farms ADD COLUMN stripe_customer_id TEXT;

-- Stripe Subscription ID (sub_xxx) — nullable
ALTER TABLE public.farms ADD COLUMN stripe_subscription_id TEXT;

-- Mirrors Stripe subscription status; default 'active' for existing farms
ALTER TABLE public.farms ADD COLUMN subscription_status TEXT NOT NULL DEFAULT 'active';

-- When the current billing period ends (for renewal date display)
ALTER TABLE public.farms ADD COLUMN current_period_end TIMESTAMPTZ;

-- Constrain subscription_status to known Stripe statuses
ALTER TABLE public.farms ADD CONSTRAINT chk_subscription_status
  CHECK (subscription_status IN ('active', 'past_due', 'canceled', 'trialing', 'incomplete', 'unpaid'));

-- One Stripe customer per farm (ignore NULLs)
CREATE UNIQUE INDEX idx_farms_stripe_customer_id
  ON public.farms (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

-- Column documentation
COMMENT ON COLUMN public.farms.stripe_customer_id IS 'Stripe Customer ID (cus_xxx) linking this farm to a Stripe customer';
COMMENT ON COLUMN public.farms.stripe_subscription_id IS 'Stripe Subscription ID (sub_xxx) for the farm''s active subscription';
COMMENT ON COLUMN public.farms.subscription_status IS 'Mirrors Stripe subscription status: active, past_due, canceled, trialing, incomplete, unpaid';
COMMENT ON COLUMN public.farms.current_period_end IS 'End of the current Stripe billing period (used for renewal date display)';

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
