-- Seed stripe_prices with live-mode Stripe price IDs.
-- These match the products created in the shared Stripe account (live mode).
-- Test-mode prices remain for backward compatibility.

INSERT INTO public.stripe_prices (stripe_price_id, subscription_tier_slug, amount, currency, interval)
VALUES
  ('price_1TCv89Rub2rnBSdxpJTM8rHd', 'starter', 50000, 'usd', 'year'),
  ('price_1TCv89Rub2rnBSdxoAZPBjDn', 'pro', 100000, 'usd', 'year')
ON CONFLICT (stripe_price_id) DO NOTHING;
