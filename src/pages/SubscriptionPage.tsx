import { useState, useCallback } from 'react';
import { Dialog, DialogBackdrop, DialogPanel } from '@headlessui/react';
import {
  ShieldCheckIcon,
  ChartBarIcon,
  BoltIcon,
  MinusIcon,
  PlusIcon,
  ExclamationTriangleIcon,
  UserCircleIcon,
  SignalIcon,
} from '@heroicons/react/24/outline';
import { useSeatUsage } from '../hooks/useSeatUsage';
import { useStripeSubscription } from '../hooks/useStripeSubscription';
import { useSubscriptionTier } from '../hooks/useSubscriptionTier';
import { useTranslation } from '../hooks/useTranslation';
import { useUserRole } from '../hooks/useUserRole';
import { useWellCount } from '../hooks/useWellCount';
import { supabase } from '../lib/supabase';

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
    <div className="h-2 bg-white/10 rounded-full mt-1">
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
        className="w-8 h-8 rounded-lg border border-white/20 flex items-center justify-center text-white/60 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        <MinusIcon className="h-4 w-4" />
      </button>
      <span className="w-8 text-center text-white font-medium tabular-nums">
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        className="w-8 h-8 rounded-lg border border-white/20 flex items-center justify-center text-white/60 hover:bg-white/10 transition-colors"
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
    <div className="bg-[#1a1a1a] rounded-xl p-5 animate-pulse">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={`h-4 bg-white/10 rounded ${i === 0 ? 'w-32 mb-3' : 'w-full mb-2'}`}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Add-on pricing constants
// ---------------------------------------------------------------------------

const ADDON_WELL_PRICE = 10000; // $100/mo in cents
const ADDON_ADMIN_PRICE = 10000; // $100/mo in cents
const ADDON_METER_CHECKER_PRICE = 5000; // $50/mo in cents

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

  const isOwner = role === 'owner' || role === 'super_admin';
  const planBadge = stripeData
    ? getStatusBadge(stripeData.status, t)
    : getStatusBadge('active', t);

  // ------ Add-on quantities ------
  const [addonWells, setAddonWells] = useState(0);
  const [addonAdmins, setAddonAdmins] = useState(0);
  const [addonMeterCheckers, setAddonMeterCheckers] = useState(0);
  const [purchasing, setPurchasing] = useState(false);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);

  // ------ Upgrade dialog state ------
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradePreview, setUpgradePreview] = useState<{
    amount: number;
    currency: string;
  } | null>(null);
  const [upgradeLoading, setUpgradeLoading] = useState(false);
  const [upgradeError, setUpgradeError] = useState<string | null>(null);

  const totalAddonCents =
    addonWells * ADDON_WELL_PRICE +
    addonAdmins * ADDON_ADMIN_PRICE +
    addonMeterCheckers * ADDON_METER_CHECKER_PRICE;

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
            meter_checker_seats: addonMeterCheckers,
          },
        }
      );

      if (error || data?.error) {
        setPurchaseError(error?.message || data?.error || 'Purchase failed');
        return;
      }

      // Reset quantities and refresh
      setAddonWells(0);
      setAddonAdmins(0);
      setAddonMeterCheckers(0);
      refetch();
    } catch (err) {
      setPurchaseError(err instanceof Error ? err.message : 'Unexpected error');
    } finally {
      setPurchasing(false);
    }
  }, [addonWells, addonAdmins, addonMeterCheckers, refetch]);

  // ------ Upgrade handlers ------
  const handleOpenUpgrade = useCallback(async () => {
    setUpgradeOpen(true);
    setUpgradeLoading(true);
    setUpgradeError(null);
    setUpgradePreview(null);

    try {
      const { data, error } = await supabase.functions.invoke(
        'update-subscription',
        {
          body: { target_tier: 'pro', preview: true },
        }
      );

      if (error || data?.error) {
        setUpgradeError(error?.message || data?.error || 'Failed to load preview');
        return;
      }

      setUpgradePreview({
        amount: data.proration_amount ?? 0,
        currency: data.currency ?? 'usd',
      });
    } catch (err) {
      setUpgradeError(err instanceof Error ? err.message : 'Unexpected error');
    } finally {
      setUpgradeLoading(false);
    }
  }, []);

  const handleConfirmUpgrade = useCallback(async () => {
    setUpgradeLoading(true);
    setUpgradeError(null);

    try {
      const { data, error } = await supabase.functions.invoke(
        'update-subscription',
        {
          body: { target_tier: 'pro' },
        }
      );

      if (error || data?.error) {
        setUpgradeError(error?.message || data?.error || 'Upgrade failed');
        return;
      }

      setUpgradeOpen(false);
      refetch();
    } catch (err) {
      setUpgradeError(err instanceof Error ? err.message : 'Unexpected error');
    } finally {
      setUpgradeLoading(false);
    }
  }, [refetch]);

  return (
    <div className="min-h-screen bg-surface-page pt-14">
      <div className="px-4 py-4 max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold text-text-heading tracking-wide mb-1">
          {t('subscription.title')}
        </h1>
        <p className="text-sm text-white/50 mb-4">{t('subscription.subtitle')}</p>

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
              <div className="bg-[#1a1a1a] rounded-xl p-5 relative overflow-hidden">
                {/* AG Watermark */}
                <span className="absolute -bottom-4 -right-2 text-[120px] font-black text-white/[0.03] leading-none select-none pointer-events-none">
                  AG
                </span>

                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <ShieldCheckIcon className="h-5 w-5 text-white/50" />
                    <h2 className="text-xs font-semibold text-white/50 uppercase tracking-wider">
                      {t('subscription.currentPlan')}
                    </h2>
                  </div>
                  <span
                    className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${planBadge.className}`}
                  >
                    {planBadge.label}
                  </span>
                </div>

                <p className="text-2xl font-bold text-white mb-2">
                  {tier.displayName}
                </p>

                {stripeData?.currentPeriodEnd && (
                  <p className="text-sm text-white/50">
                    {t('subscription.nextBilling', {
                      date: formatDate(stripeData.currentPeriodEnd, locale),
                    })}
                  </p>
                )}

                {/* Upgrade Plan button -- Starter + owner/super_admin only */}
                {isOwner && tier.slug === 'starter' && (
                  <button
                    onClick={handleOpenUpgrade}
                    className="mt-4 w-full py-2.5 rounded-lg font-medium text-sm transition-colors border border-white/20 text-white hover:bg-white/10"
                  >
                    {t('subscription.upgradePlan')} &rarr;
                  </button>
                )}
              </div>
            ) : (
              <SkeletonCard lines={4} />
            )}

            {/* ---- Usage Card ---- */}
            {tier && seatUsage ? (
              <div className="bg-[#1a1a1a] rounded-xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <ChartBarIcon className="h-5 w-5 text-white/50" />
                  <h2 className="text-xs font-semibold text-white/50 uppercase tracking-wider">
                    {t('subscription.currentUsage')}
                  </h2>
                </div>

                <div className="space-y-4">
                  {/* Active Wells */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <SignalIcon className="h-4 w-4 text-white/40" />
                        <span className="text-sm text-white">
                          {t('subscription.activeWells')}
                        </span>
                      </div>
                      <span
                        className={`text-sm font-medium tabular-nums ${
                          wellCount >= tier.maxWells ? 'text-red-400' : 'text-white'
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
                        <UserCircleIcon className="h-4 w-4 text-white/40" />
                        <span className="text-sm text-white">
                          {t('subscription.admin')}
                        </span>
                      </div>
                      <span
                        className={`text-sm font-medium tabular-nums ${
                          seatUsage.admin.isFull ? 'text-red-400' : 'text-white'
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

                  {/* Meter Checker */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <UserCircleIcon className="h-4 w-4 text-white/40" />
                        <span className="text-sm text-white">
                          {t('subscription.meterChecker')}
                        </span>
                      </div>
                      <span
                        className={`text-sm font-medium tabular-nums ${
                          seatUsage.meter_checker.isFull ? 'text-red-400' : 'text-white'
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
            <div className="bg-[#1a1a1a] rounded-xl p-5">
              <div className="flex items-center gap-2 mb-1">
                <BoltIcon className="h-5 w-5 text-white/50" />
                <h2 className="text-xs font-semibold text-white/50 uppercase tracking-wider">
                  {t('subscription.purchaseAddOns')}
                </h2>
              </div>
              <p className="text-sm text-white/40 mb-5">
                {t('subscription.addOnSubtitle')}
              </p>

              <div className="space-y-3">
                {/* Wells add-on */}
                <div className="border border-white/10 rounded-lg p-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-white font-medium">
                      {t('subscription.wellsAddon')}
                    </p>
                    <p className="text-xs text-white/40">$100/mo</p>
                  </div>
                  {isOwner ? (
                    <QuantityCounter value={addonWells} onChange={setAddonWells} />
                  ) : (
                    <span className="text-xs text-white/30">--</span>
                  )}
                </div>

                {/* Admin seats add-on */}
                <div className="border border-white/10 rounded-lg p-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-white font-medium">
                      {t('subscription.adminSeatsAddon')}
                    </p>
                    <p className="text-xs text-white/40">$100/mo</p>
                  </div>
                  {isOwner ? (
                    <QuantityCounter value={addonAdmins} onChange={setAddonAdmins} />
                  ) : (
                    <span className="text-xs text-white/30">--</span>
                  )}
                </div>

                {/* Meter checker seats add-on */}
                <div className="border border-white/10 rounded-lg p-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-white font-medium">
                      {t('subscription.meterCheckersAddon')}
                    </p>
                    <p className="text-xs text-white/40">$50/mo</p>
                  </div>
                  {isOwner ? (
                    <QuantityCounter
                      value={addonMeterCheckers}
                      onChange={setAddonMeterCheckers}
                    />
                  ) : (
                    <span className="text-xs text-white/30">--</span>
                  )}
                </div>
              </div>

              {/* Total & Confirm */}
              {isOwner && (
                <div className="mt-5 pt-4 border-t border-white/10">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-white font-medium">
                      {t('subscription.totalDueToday', {
                        amount: formatCurrency(totalAddonCents, 'usd'),
                      })}
                    </span>
                  </div>
                  <p className="text-xs text-white/30 mb-3">
                    {t('subscription.proratedNote')}
                  </p>

                  {purchaseError && (
                    <p className="text-sm text-red-400 mb-2">{purchaseError}</p>
                  )}

                  <button
                    onClick={handlePurchaseAddons}
                    disabled={totalAddonCents === 0 || purchasing}
                    className="w-full py-2.5 rounded-lg font-medium text-sm transition-colors bg-green-600 text-white hover:bg-green-500 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {purchasing
                      ? t('subscription.purchasing')
                      : t('subscription.confirmPurchase')}
                  </button>
                </div>
              )}
            </div>

            {/* Manage in Stripe Portal */}
            {isOwner && stripeData && (
              <div className="bg-[#1a1a1a] rounded-xl p-5 mt-4">
                <h2 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">
                  {t('subscription.manageSubscription')}
                </h2>
                <p className="text-sm text-white/40 mb-3">
                  {t('subscription.portalDescription')}
                </p>
                <button
                  onClick={() => openPortal()}
                  className="w-full py-2.5 rounded-lg font-medium text-sm transition-colors bg-surface-header text-white hover:bg-surface-header/90"
                >
                  {t('subscription.openPortal')}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ----------------------------------------------------------------
            Cancel Subscription Link (bottom, subtle)
        ---------------------------------------------------------------- */}
        {isOwner && stripeData && stripeData.status !== 'canceled' && (
          <div className="mt-8 mb-4 text-center">
            <button
              onClick={() => openPortal('subscription_cancel')}
              className="text-sm text-white/30 hover:text-white/50 transition-colors"
            >
              {t('subscription.cancelSubscription')}
            </button>
          </div>
        )}
      </div>

      {/* ----------------------------------------------------------------
          Upgrade Confirmation Dialog
      ---------------------------------------------------------------- */}
      <Dialog
        open={upgradeOpen}
        onClose={() => !upgradeLoading && setUpgradeOpen(false)}
        className="relative z-50"
      >
        <DialogBackdrop
          transition
          className="fixed inset-0 bg-black/60 transition-opacity duration-300 ease-out data-[closed]:opacity-0"
        />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <DialogPanel
            transition
            className="w-full max-w-sm bg-[#1a1a1a] rounded-xl p-6 transition duration-300 ease-out data-[closed]:scale-95 data-[closed]:opacity-0"
          >
            <h3 className="text-lg font-bold text-white mb-2">
              {t('subscription.upgradeTitle')}
            </h3>
            <p className="text-sm text-white/50 mb-4">
              {t('subscription.upgradeDesc')}
            </p>

            {upgradeLoading && !upgradePreview && (
              <div className="flex items-center justify-center py-6">
                <div className="h-6 w-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              </div>
            )}

            {upgradePreview && (
              <div className="bg-white/5 rounded-lg p-3 mb-4">
                <p className="text-sm text-white/70">
                  {t('subscription.totalDueToday', {
                    amount: formatCurrency(
                      upgradePreview.amount,
                      upgradePreview.currency
                    ),
                  })}
                </p>
                <p className="text-xs text-white/30 mt-1">
                  {t('subscription.proratedNote')}
                </p>
              </div>
            )}

            {upgradeError && (
              <p className="text-sm text-red-400 mb-3">{upgradeError}</p>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setUpgradeOpen(false)}
                disabled={upgradeLoading}
                className="flex-1 py-2.5 rounded-lg font-medium text-sm border border-white/20 text-white hover:bg-white/10 transition-colors disabled:opacity-40"
              >
                {t('subscription.canceled')}
              </button>
              <button
                onClick={handleConfirmUpgrade}
                disabled={upgradeLoading || !upgradePreview}
                className="flex-1 py-2.5 rounded-lg font-medium text-sm bg-green-600 text-white hover:bg-green-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {upgradeLoading
                  ? t('subscription.upgrading')
                  : t('subscription.confirmUpgrade')}
              </button>
            </div>
          </DialogPanel>
        </div>
      </Dialog>
    </div>
  );
}
