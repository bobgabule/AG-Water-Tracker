import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface StripeSubscriptionData {
  status: 'active' | 'past_due' | 'canceled' | 'trialing' | 'incomplete' | 'unpaid';
  currentPeriodEnd: string;
  planName: string;
  unitAmount: number; // cents
  currency: string;
  paymentMethod: { brand: string; last4: string } | null;
  invoices: Array<{
    date: string;
    amount: number;
    status: string;
    invoicePdf: string | null;
  }>;
}

export interface UseStripeSubscriptionResult {
  data: StripeSubscriptionData | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Fetches live Stripe subscription data via the cancel-subscription
 * (get-subscription-details) edge function.
 *
 * Returns subscription status, payment method, and recent invoices.
 * NOT from PowerSync -- this is live Stripe data fetched over the network.
 */
export function useStripeSubscription(): UseStripeSubscriptionResult {
  const [data, setData] = useState<StripeSubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSubscription = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: response, error: fnError } = await supabase.functions.invoke(
        'cancel-subscription',
        { method: 'GET' }
      );

      if (fnError) {
        setError(fnError.message || 'Failed to load subscription details');
        setData(null);
        return;
      }

      if (response?.error) {
        setError(response.error);
        setData(null);
        return;
      }

      // Map snake_case response to camelCase
      const mapped: StripeSubscriptionData = {
        status: response.subscription_status ?? 'active',
        currentPeriodEnd: response.current_period_end
          ? typeof response.current_period_end === 'number'
            ? new Date(response.current_period_end * 1000).toISOString()
            : response.current_period_end
          : '',
        planName: response.plan_name ?? '',
        unitAmount: response.unit_amount ?? 0,
        currency: response.currency ?? 'usd',
        paymentMethod: response.payment_method ?? null,
        invoices: (response.recent_invoices ?? []).map(
          (inv: { date: number | string; amount: number; status: string; invoice_pdf: string | null }) => ({
            date: typeof inv.date === 'number'
              ? new Date(inv.date * 1000).toISOString()
              : inv.date,
            amount: inv.amount,
            status: inv.status,
            invoicePdf: inv.invoice_pdf ?? null,
          })
        ),
      };

      setData(mapped);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  return { data, loading, error, refetch: fetchSubscription };
}
