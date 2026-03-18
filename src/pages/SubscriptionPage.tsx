import { useState, useCallback } from 'react';
import {
  ShieldCheckIcon,
  ChartBarIcon,
  BoltIcon,
  MinusIcon,
  PlusIcon,
  ExclamationTriangleIcon,
  UserIcon,
} from '@heroicons/react/24/outline';

function WaterDropIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 2.25c0 0-6.75 8.25-6.75 12a6.75 6.75 0 0 0 13.5 0C18.75 10.5 12 2.25 12 2.25Z" />
    </svg>
  );
}
import { useFarmReadOnly } from '../hooks/useFarmReadOnly';
import { useSeatUsage } from '../hooks/useSeatUsage';
import { useStripeSubscription } from '../hooks/useStripeSubscription';
import { useSubscriptionTier } from '../hooks/useSubscriptionTier';
import { useTranslation } from '../hooks/useTranslation';
import { useUserRole } from '../hooks/useUserRole';
import { useWellCount } from '../hooks/useWellCount';
import { supabase } from '../lib/supabase';
import { useToastStore } from '../stores/toastStore';

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
      return { label: t('subscription.active'), className: 'bg-green-100 text-green-700' };
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
    <div className="h-2 bg-text-heading/30 rounded-full mt-1">
      <div
        className={`h-2 rounded-full transition-all ${isFull ? 'bg-red-500' : 'bg-green-500'}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Quantity Counter
// ---------------------------------------------------------------------------

function QuantityCounter({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => onChange(Math.max(0, value - 1))}
        disabled={value === 0}
        className="w-8 h-8 rounded-lg border border-text-heading/50 flex items-center justify-center text-text-heading/70 hover:bg-text-heading/15 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        <MinusIcon className="h-4 w-4" />
      </button>
      <span className="w-8 text-center text-text-heading font-medium tabular-nums">
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        className="w-8 h-8 rounded-lg border border-text-heading/50 flex items-center justify-center text-text-heading/70 hover:bg-text-heading/15 transition-colors"
      >
        <PlusIcon className="h-4 w-4" />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Skeleton Block
// ---------------------------------------------------------------------------

function SkeletonCard({ lines }: { lines: number }) {
  return (
    <div className="bg-surface-card rounded-xl p-5 animate-pulse">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={`h-4 bg-text-heading/15 rounded ${i === 0 ? 'w-32 mb-3' : 'w-full mb-2'}`}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Add-on pricing constants
// ---------------------------------------------------------------------------

const ADDON_WELL_PRICE = 10000; // $100/yr in cents
const ADDON_ADMIN_PRICE = 10000; // $100/yr in cents
const ADDON_METER_READER_PRICE = 5000; // $50/yr in cents

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function SubscriptionPage() {
  const { t, locale } = useTranslation();
  const role = useUserRole();
  const tier = useSubscriptionTier();
  const seatUsage = useSeatUsage();
  const wellCount = useWellCount();
  const { data: stripeData, refetch } = useStripeSubscription();

  const { isReadOnly, deletionDate } = useFarmReadOnly();
  const isOwner = role === 'owner' || role === 'super_admin';
  const canPurchase = role === 'owner' || role === 'super_admin' || role === 'admin';
  const planBadge = stripeData
    ? getStatusBadge(stripeData.status, t)
    : getStatusBadge('active', t);

  // ------ Add-on quantities ------
  const [addonWells, setAddonWells] = useState(0);
  const [addonAdmins, setAddonAdmins] = useState(0);
  const [addonMeterReaders, setAddonMeterReaders] = useState(0);
  const [purchasing, setPurchasing] = useState(false);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);

  const totalAddonCents =
    addonWells * ADDON_WELL_PRICE +
    addonAdmins * ADDON_ADMIN_PRICE +
    addonMeterReaders * ADDON_METER_READER_PRICE;

  const hasFailedPayment =
    stripeData?.status === 'past_due' || stripeData?.status === 'unpaid';

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

  // ------ Purchase add-ons handler ------
  const handlePurchaseAddons = useCallback(async () => {
    setPurchasing(true);
    setPurchaseError(null);

    try {
      const { data, error } = await supabase.functions.invoke(
        'purchase-addons',
        {
          body: {
            wells: addonWells,
            admin_seats: addonAdmins,
            meter_checker_seats: addonMeterReaders,
          },
        }
      );

      if (error || data?.error) {
        setPurchaseError(error?.message || data?.error || 'Purchase failed');
        return;
      }

      // Build dynamic success message listing what was purchased
      const parts: string[] = [];
      if (addonWells > 0) parts.push(addonWells === 1 ? `1 well` : `${addonWells} wells`);
      if (addonAdmins > 0) parts.push(addonAdmins === 1 ? `1 admin seat` : `${addonAdmins} admin seats`);
      if (addonMeterReaders > 0) parts.push(addonMeterReaders === 1 ? `1 meter reader seat` : `${addonMeterReaders} meter reader seats`);
      const summary = parts.join(', ');

      // Reset quantities, show success toast, and refresh
      setAddonWells(0);
      setAddonAdmins(0);
      setAddonMeterReaders(0);
      useToastStore.getState().show(t('subscription.purchaseSuccess', { items: summary }));
      refetch();
    } catch (err) {
      setPurchaseError(err instanceof Error ? err.message : 'Unexpected error');
    } finally {
      setPurchasing(false);
    }
  }, [addonWells, addonAdmins, addonMeterReaders, refetch]);

  return (
    <div className="min-h-screen bg-surface-page pt-14">
      <div className="px-4 py-4 max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold text-text-heading tracking-wide mb-1">
          {t('subscription.title')}
        </h1>
        <p className="text-sm text-text-heading/70 mb-4">{t('subscription.subtitle')}</p>

        {/* ----------------------------------------------------------------
            Read-Only Banner (canceled + period ended, owner only)
        ---------------------------------------------------------------- */}
        {isReadOnly && isOwner && (
          <div className="bg-red-800/90 rounded-xl p-4 mb-4 flex items-start gap-3 sticky top-14 z-10">
            <ExclamationTriangleIcon className="h-5 w-5 text-white shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-white text-sm mb-2">
                {t('subscription.readOnlyBanner', {
                  date: deletionDate ? formatDate(deletionDate, locale) : '',
                })}
              </p>
              <button
                onClick={() => openPortal()}
                className="text-sm font-semibold text-white bg-red-600 hover:bg-red-500 px-4 py-1.5 rounded-lg transition-colors"
              >
                {t('subscription.renewSubscription')}
              </button>
            </div>
          </div>
        )}

        {/* ----------------------------------------------------------------
            Failed Payment Banner (conditional)
        ---------------------------------------------------------------- */}
        {hasFailedPayment && (
          <div className="bg-red-800/90 rounded-xl p-4 mb-4 flex items-start gap-3 sticky top-14 z-10">
            <ExclamationTriangleIcon className="h-5 w-5 text-white shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-white text-sm mb-2">
                {t('subscription.paymentFailed')}
              </p>
              <button
                onClick={() => openPortal('payment_method_update')}
                className="text-sm font-semibold text-white bg-red-600 hover:bg-red-500 px-4 py-1.5 rounded-lg transition-colors"
              >
                {t('subscription.payNow')}
              </button>
            </div>
          </div>
        )}

        {/* ----------------------------------------------------------------
            2-Column Grid (desktop only)
        ---------------------------------------------------------------- */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* ============================================================
              LEFT COLUMN: Plan Card + Usage Card
          ============================================================ */}
          <div className="space-y-4">
            {/* ---- Plan Card ---- */}
            {tier ? (
              <div className="bg-surface-card rounded-xl p-5">
                <span
                  className={`inline-block text-xs font-medium px-2.5 py-0.5 rounded-full mb-3 ${planBadge.className}`}
                >
                  {planBadge.label}
                </span>

                <p className="text-2xl font-bold text-text-heading mb-1">
                  {tier.displayName}
                </p>
                {stripeData?.currentPeriodEnd && (
                  <p className="text-sm text-text-heading/75">
                    {t('subscription.nextBillingDate', {
                      date: formatDate(stripeData.currentPeriodEnd, locale),
                    })}
                  </p>
                )}
              </div>
            ) : (
              <SkeletonCard lines={4} />
            )}

            {/* ---- Usage Card ---- */}
            {tier && seatUsage ? (
              <div className="bg-surface-card rounded-xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <ChartBarIcon className="h-5 w-5 text-text-heading" />
                  <h2 className="text-sm font-bold text-text-heading uppercase tracking-wider">
                    {t('subscription.currentUsage')}
                  </h2>
                </div>

                <div className="space-y-4">
                  {/* Active Wells */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <WaterDropIcon className="h-4 w-4 text-text-heading/70" />
                        <span className="text-sm text-text-heading">
                          {t('subscription.activeWells')}
                        </span>
                      </div>
                      <span
                        className={`text-sm font-medium tabular-nums ${
                          wellCount >= tier.maxWells ? 'text-red-400' : 'text-text-heading'
                        }`}
                      >
                        {wellCount} / {tier.maxWells}
                      </span>
                    </div>
                    <UsageBar used={wellCount} limit={tier.maxWells} />
                  </div>

                  {/* Admin */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <ShieldCheckIcon className="h-4 w-4 text-text-heading/70" />
                        <span className="text-sm text-text-heading">
                          {t('subscription.admin')}
                        </span>
                      </div>
                      <span
                        className={`text-sm font-medium tabular-nums ${
                          seatUsage.admin.isFull ? 'text-red-400' : 'text-text-heading'
                        }`}
                      >
                        {seatUsage.admin.used} / {seatUsage.admin.limit}
                      </span>
                    </div>
                    <UsageBar
                      used={seatUsage.admin.used}
                      limit={seatUsage.admin.limit}
                    />
                  </div>

                  {/* Meter reader */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <UserIcon className="h-4 w-4 text-text-heading/70" />
                        <span className="text-sm text-text-heading">
                          {t('subscription.meterReader')}
                        </span>
                      </div>
                      <span
                        className={`text-sm font-medium tabular-nums ${
                          seatUsage.meter_checker.isFull ? 'text-red-400' : 'text-text-heading'
                        }`}
                      >
                        {seatUsage.meter_checker.used} /{' '}
                        {seatUsage.meter_checker.limit}
                      </span>
                    </div>
                    <UsageBar
                      used={seatUsage.meter_checker.used}
                      limit={seatUsage.meter_checker.limit}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <SkeletonCard lines={5} />
            )}
          </div>

          {/* ============================================================
              RIGHT COLUMN: Purchase Add-ons Card
          ============================================================ */}
          <div>
            <div className="bg-surface-card rounded-xl p-5">
              <div className="flex items-center gap-2 mb-1">
                <BoltIcon className="h-5 w-5 text-text-heading/80" aria-hidden="true" />
                <h2 className="text-sm font-bold text-text-heading uppercase tracking-wider">
                  {t('subscription.purchaseAddOns')}
                </h2>
              </div>
              <p className="text-sm text-text-heading/70 mb-5">
                {t('subscription.addOnSubtitle')}
              </p>

              <div className="space-y-3">
                {/* Wells add-on */}
                <div className="border border-text-heading/20 rounded-lg p-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-text-heading font-medium">
                      {t('subscription.wellsAddon')}
                    </p>
                    <p className="text-xs text-text-heading/70">{t('subscription.perYear', { amount: formatCurrency(ADDON_WELL_PRICE, 'usd') })}</p>
                  </div>
                  {canPurchase && !isReadOnly ? (
                    <QuantityCounter value={addonWells} onChange={setAddonWells} />
                  ) : (
                    <span className="text-xs text-text-heading/60">--</span>
                  )}
                </div>

                {/* Admin seats add-on */}
                <div className="border border-text-heading/20 rounded-lg p-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-text-heading font-medium">
                      {t('subscription.adminSeatsAddon')}
                    </p>
                    <p className="text-xs text-text-heading/70">{t('subscription.perYear', { amount: formatCurrency(ADDON_ADMIN_PRICE, 'usd') })}</p>
                  </div>
                  {canPurchase && !isReadOnly ? (
                    <QuantityCounter value={addonAdmins} onChange={setAddonAdmins} />
                  ) : (
                    <span className="text-xs text-text-heading/60">--</span>
                  )}
                </div>

                {/* Meter reader seats add-on */}
                <div className="border border-text-heading/20 rounded-lg p-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-text-heading font-medium">
                      {t('subscription.meterReadersAddon')}
                    </p>
                    <p className="text-xs text-text-heading/70">{t('subscription.perYear', { amount: formatCurrency(ADDON_METER_READER_PRICE, 'usd') })}</p>
                  </div>
                  {canPurchase && !isReadOnly ? (
                    <QuantityCounter
                      value={addonMeterReaders}
                      onChange={setAddonMeterReaders}
                    />
                  ) : (
                    <span className="text-xs text-text-heading/60">--</span>
                  )}
                </div>
              </div>

              {/* Total & Confirm */}
              {canPurchase && (
                <div className="mt-5 pt-4 border-t border-text-heading/20">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-text-heading font-medium">
                      {t('subscription.totalDueToday', {
                        amount: formatCurrency(totalAddonCents, 'usd'),
                      })}
                    </span>
                  </div>
                  <p className="text-xs text-text-heading/60 mb-3">
                    {t('subscription.proratedNote')}
                  </p>

                  {purchaseError && (
                    <p className="text-sm text-red-400 mb-2">{purchaseError}</p>
                  )}

                  <button
                    onClick={handlePurchaseAddons}
                    disabled={totalAddonCents === 0 || purchasing || isReadOnly}
                    className="btn-primary w-full"
                  >
                    {purchasing
                      ? t('subscription.purchasing')
                      : t('subscription.confirmPurchase')}
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* ----------------------------------------------------------------
            Cancel Subscription Link (bottom, subtle)
        ---------------------------------------------------------------- */}
        {canPurchase && stripeData?.status !== 'canceled' && (
          <div className="mt-8 mb-4 text-center">
            <button
              onClick={() => openPortal('subscription_cancel')}
              className="text-sm text-text-heading/70 hover:text-text-heading transition-colors cursor-pointer"
            >
              {t('subscription.cancelSubscription')}
            </button>
          </div>
        )}
      </div>

    </div>
  );
}
