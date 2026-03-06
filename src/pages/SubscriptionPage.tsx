import { useState, useCallback } from 'react';
import { ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';
import { useActiveFarm } from '../hooks/useActiveFarm';
import { useSeatUsage } from '../hooks/useSeatUsage';
import { useStripeSubscription } from '../hooks/useStripeSubscription';
import { useSubscriptionTier } from '../hooks/useSubscriptionTier';
import { useTranslation } from '../hooks/useTranslation';
import { useUserRole } from '../hooks/useUserRole';
import { useWellCount } from '../hooks/useWellCount';
import { supabase } from '../lib/supabase';
import PlanChangeModal from '../components/PlanChangeModal';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(cents: number, currency: string): string {
  return (cents / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: currency || 'usd',
  });
}

function formatDate(isoDate: string, locale: string): string {
  if (!isoDate) return '';
  const date = new Date(isoDate);
  return date.toLocaleDateString(locale === 'es' ? 'es-US' : 'en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

interface StatusBadge {
  label: string;
  className: string;
}

function getStatusBadge(
  status: string,
  t: (key: string) => string
): StatusBadge {
  switch (status) {
    case 'active':
      return { label: t('subscription.active'), className: 'bg-green-700 text-white' };
    case 'past_due':
      return { label: t('subscription.pastDue'), className: 'bg-red-700 text-white' };
    case 'canceled':
      return { label: t('subscription.canceled'), className: 'bg-gray-600 text-white' };
    case 'trialing':
      return { label: t('subscription.trial'), className: 'bg-blue-700 text-white' };
    default:
      return { label: status, className: 'bg-gray-600 text-white' };
  }
}

// ---------------------------------------------------------------------------
// Progress Bar
// ---------------------------------------------------------------------------

function UsageBar({ used, limit }: { used: number; limit: number }) {
  const pct = limit > 0 ? Math.min((used / limit) * 100, 100) : 0;
  const isFull = used >= limit && limit > 0;

  return (
    <div className="h-2 bg-gray-300 rounded-full mt-1">
      <div
        className={`h-2 rounded-full transition-all ${isFull ? 'bg-red-700' : 'bg-surface-header'}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Skeleton Blocks
// ---------------------------------------------------------------------------

function SkeletonCard({ lines }: { lines: number }) {
  return (
    <div className="bg-surface-card rounded-lg p-4 mb-4 animate-pulse">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={`h-4 bg-surface-page rounded ${i === 0 ? 'w-32 mb-3' : 'w-full mb-2'}`}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function SubscriptionPage() {
  const { t, locale } = useTranslation();
  const { farmId } = useActiveFarm();
  const role = useUserRole();
  const tier = useSubscriptionTier();
  const seatUsage = useSeatUsage();
  const wellCount = useWellCount();
  const { data: stripeData, loading: stripeLoading, refetch } = useStripeSubscription();

  const [modalOpen, setModalOpen] = useState(false);
  const [modalProcessing, setModalProcessing] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const isOwner = role === 'owner' || role === 'super_admin';
  const currentTierSlug = (tier?.slug ?? 'starter') as 'starter' | 'pro';
  const targetTier: 'starter' | 'pro' = currentTierSlug === 'starter' ? 'pro' : 'starter';

  // ------ Portal helper ------
  const openPortal = useCallback(async (flowType?: string) => {
    try {
      const body: Record<string, string> = {};
      if (flowType) body.flow_type = flowType;

      const { data, error } = await supabase.functions.invoke(
        'create-portal-session',
        { body }
      );

      if (error || data?.error) {
        console.error('Portal session error:', error?.message || data?.error);
        return;
      }

      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (err) {
      console.error('Failed to open portal:', err);
    }
  }, []);

  // ------ Plan change handler ------
  const handleConfirmPlanChange = useCallback(async () => {
    setModalProcessing(true);
    setModalError(null);

    try {
      const { data, error } = await supabase.functions.invoke(
        'update-subscription',
        { body: { target_tier: targetTier } }
      );

      if (error || data?.error) {
        setModalError(error?.message || data?.error || 'Failed to update plan');
        return;
      }

      setModalOpen(false);
      refetch();
    } catch (err) {
      setModalError(err instanceof Error ? err.message : 'Unexpected error');
    } finally {
      setModalProcessing(false);
    }
  }, [targetTier, refetch]);

  const hasFailedPayment =
    stripeData?.status === 'past_due' || stripeData?.status === 'unpaid';

  return (
    <div className="min-h-screen bg-surface-page pt-14">
      <div className="px-4 py-4">
        <h1 className="text-2xl font-bold text-text-heading tracking-wide mb-4">
          {t('subscription.title')}
        </h1>

        {/* ----------------------------------------------------------------
            1. Failed Payment Banner (conditional)
        ---------------------------------------------------------------- */}
        {hasFailedPayment && (
          <div className="bg-red-800/90 rounded-lg p-4 mb-4 sticky top-14 z-10">
            <p className="text-white text-sm mb-2">
              {t('subscription.paymentFailed')}
            </p>
            <button
              onClick={() => openPortal('payment_method_update')}
              className="text-sm font-medium text-white underline"
            >
              {t('subscription.updatePayment')}
            </button>
          </div>
        )}

        {/* ----------------------------------------------------------------
            2. Current Plan Section
        ---------------------------------------------------------------- */}
        {stripeLoading ? (
          <SkeletonCard lines={4} />
        ) : stripeData ? (
          <div className="bg-surface-card rounded-lg p-4 mb-4">
            {(() => {
              const badge = getStatusBadge(stripeData.status, t);
              return (
                <div className="flex items-center justify-between mb-1">
                  <h2 className="text-xs font-semibold text-text-heading/70 uppercase tracking-wider">
                    {t('subscription.currentPlan')}
                  </h2>
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${badge.className}`}
                  >
                    {badge.label}
                  </span>
                </div>
              );
            })()}

            <p className="text-lg font-bold text-text-heading mb-1">
              {tier?.displayName ?? stripeData.planName}
            </p>

            {stripeData.currentPeriodEnd && (
              <p className="text-sm text-text-body mb-1">
                {t('subscription.renewsOn', {
                  date: formatDate(stripeData.currentPeriodEnd, locale),
                })}
              </p>
            )}

            {stripeData.unitAmount > 0 && (
              <p className="text-sm text-text-body mb-3">
                {t('subscription.perMonth', {
                  amount: formatCurrency(stripeData.unitAmount, stripeData.currency),
                })}
              </p>
            )}

            {/* Plan change button -- owners only */}
            {isOwner && farmId && (
              <button
                onClick={() => setModalOpen(true)}
                className={`w-full py-2.5 rounded-lg font-medium text-sm transition-colors ${
                  currentTierSlug === 'starter'
                    ? 'bg-btn-action text-white hover:bg-btn-action/80'
                    : 'bg-gray-400 text-gray-800 hover:bg-gray-500'
                }`}
              >
                {currentTierSlug === 'starter'
                  ? t('subscription.upgradeToPro')
                  : t('subscription.downgradeToStarter')}
              </button>
            )}

            {/* Modal error */}
            {modalError && (
              <p className="text-red-700 text-sm mt-2">{modalError}</p>
            )}
          </div>
        ) : null}

        {/* ----------------------------------------------------------------
            3. Seats & Wells Section (PowerSync -- instant)
        ---------------------------------------------------------------- */}
        {tier && seatUsage ? (
          <div className="bg-surface-card rounded-lg p-4 mb-4">
            <h2 className="text-xs font-semibold text-text-heading/70 uppercase tracking-wider mb-3">
              {t('subscription.usage')}
            </h2>
            <div className="space-y-3">
              {/* Admins */}
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-heading">{t('subscription.admins')}</span>
                  <span
                    className={`text-sm font-medium ${
                      seatUsage.admin.isFull ? 'text-red-800' : 'text-text-heading'
                    }`}
                  >
                    {seatUsage.admin.used} / {seatUsage.admin.limit}
                    {seatUsage.admin.isFull && (
                      <span className="ml-1.5 text-xs bg-red-800 text-white px-1.5 py-0.5 rounded-full">
                        {t('subscription.full')}
                      </span>
                    )}
                  </span>
                </div>
                <UsageBar used={seatUsage.admin.used} limit={seatUsage.admin.limit} />
              </div>

              {/* Meter Checkers */}
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-heading">
                    {t('subscription.meterCheckers')}
                  </span>
                  <span
                    className={`text-sm font-medium ${
                      seatUsage.meter_checker.isFull ? 'text-red-800' : 'text-text-heading'
                    }`}
                  >
                    {seatUsage.meter_checker.used} / {seatUsage.meter_checker.limit}
                    {seatUsage.meter_checker.isFull && (
                      <span className="ml-1.5 text-xs bg-red-800 text-white px-1.5 py-0.5 rounded-full">
                        {t('subscription.full')}
                      </span>
                    )}
                  </span>
                </div>
                <UsageBar
                  used={seatUsage.meter_checker.used}
                  limit={seatUsage.meter_checker.limit}
                />
              </div>

              {/* Wells */}
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-heading">{t('subscription.wells')}</span>
                  <span
                    className={`text-sm font-medium ${
                      wellCount >= tier.maxWells ? 'text-red-800' : 'text-text-heading'
                    }`}
                  >
                    {wellCount} / {tier.maxWells}
                    {wellCount >= tier.maxWells && (
                      <span className="ml-1.5 text-xs bg-red-800 text-white px-1.5 py-0.5 rounded-full">
                        {t('subscription.full')}
                      </span>
                    )}
                  </span>
                </div>
                <UsageBar used={wellCount} limit={tier.maxWells} />
              </div>
            </div>
          </div>
        ) : (
          !tier && (
            <div className="bg-surface-card rounded-lg p-3 mb-4 animate-pulse">
              <div className="h-4 bg-surface-page rounded w-24 mb-2" />
              <div className="h-3 bg-surface-page rounded w-full mb-1" />
              <div className="h-3 bg-surface-page rounded w-full mb-1" />
              <div className="h-3 bg-surface-page rounded w-full" />
            </div>
          )
        )}

        {/* ----------------------------------------------------------------
            4. Payment Method Section
        ---------------------------------------------------------------- */}
        {stripeLoading ? (
          <SkeletonCard lines={2} />
        ) : stripeData ? (
          <div className="bg-surface-card rounded-lg p-4 mb-4">
            <h2 className="text-xs font-semibold text-text-heading/70 uppercase tracking-wider mb-2">
              {t('subscription.paymentMethod')}
            </h2>
            {stripeData.paymentMethod ? (
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-heading">
                  {t('subscription.cardEnding', {
                    brand: stripeData.paymentMethod.brand.charAt(0).toUpperCase() +
                      stripeData.paymentMethod.brand.slice(1),
                    last4: stripeData.paymentMethod.last4,
                  })}
                </span>
                <button
                  onClick={() => openPortal('payment_method_update')}
                  className="text-sm font-medium text-teal hover:text-teal-hover transition-colors"
                >
                  {t('subscription.manage')}
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-heading/60">
                  {t('subscription.noPaymentMethod')}
                </span>
                <button
                  onClick={() => openPortal('payment_method_update')}
                  className="text-sm font-medium text-teal hover:text-teal-hover transition-colors"
                >
                  {t('subscription.addPaymentMethod')}
                </button>
              </div>
            )}
          </div>
        ) : null}

        {/* ----------------------------------------------------------------
            5. Recent Transactions Section
        ---------------------------------------------------------------- */}
        {stripeLoading ? (
          <SkeletonCard lines={4} />
        ) : stripeData ? (
          <div className="bg-surface-card rounded-lg p-4 mb-4">
            <h2 className="text-xs font-semibold text-text-heading/70 uppercase tracking-wider mb-3">
              {t('subscription.recentTransactions')}
            </h2>

            {stripeData.invoices.length === 0 ? (
              <p className="text-sm text-text-heading/60">
                {t('subscription.noTransactions')}
              </p>
            ) : (
              <div className="space-y-2">
                {stripeData.invoices.slice(0, 5).map((inv, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="text-text-heading/70">
                      {formatDate(inv.date, locale)}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-text-heading font-medium">
                        {formatCurrency(inv.amount, stripeData.currency)}
                      </span>
                      {inv.invoicePdf && (
                        <a
                          href={inv.invoicePdf}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-teal hover:text-teal-hover transition-colors"
                          title={t('subscription.receipt')}
                        >
                          <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* View All in Stripe Portal */}
            <button
              onClick={() => openPortal()}
              className="mt-3 w-full text-center text-sm font-medium text-teal hover:text-teal-hover transition-colors flex items-center justify-center gap-1"
            >
              {t('subscription.viewAll')}
              <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : null}
      </div>

      {/* Plan Change Modal */}
      <PlanChangeModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setModalError(null);
        }}
        onConfirm={handleConfirmPlanChange}
        targetTier={targetTier}
        currentTier={currentTierSlug}
        isProcessing={modalProcessing}
      />
    </div>
  );
}
