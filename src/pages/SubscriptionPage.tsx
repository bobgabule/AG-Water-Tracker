import { ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';
import { useActiveFarm } from '../hooks/useActiveFarm';
import { useAppSetting } from '../hooks/useAppSetting';
import { useSeatUsage } from '../hooks/useSeatUsage';
import { useSubscriptionTier } from '../hooks/useSubscriptionTier';
import { useWellCount } from '../hooks/useWellCount';
import { buildSubscriptionUrl } from '../lib/subscriptionUrls';
import { useTranslation } from '../hooks/useTranslation';

export default function SubscriptionPage() {
  const { t } = useTranslation();
  const { farmId } = useActiveFarm();

  const tier = useSubscriptionTier();
  const seatUsage = useSeatUsage();
  const wellCount = useWellCount();

  // Subscription management URL from app_settings
  const subscriptionUrl = useAppSetting('subscription_website_url');

  return (
    <div className="min-h-screen bg-surface-page pt-14">
      <div className="px-4 py-4">
        <h1 className="text-2xl font-bold text-text-heading tracking-wide mb-4">{t('subscription.title')}</h1>

        {/* Seat and well usage summary */}
        {tier && seatUsage && (
          <div className="bg-surface-card rounded-lg p-3 mb-4">
            <h2 className="text-xs font-semibold text-text-heading/70 uppercase tracking-wider mb-2">
              {tier.displayName}
            </h2>
            <div className="space-y-1">
              {/* Admin seats */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-heading">{t('subscription.admins')}</span>
                <span className={`text-sm font-medium ${seatUsage.admin.isFull ? 'text-red-600' : 'text-text-heading'}`}>
                  {seatUsage.admin.used} / {seatUsage.admin.limit}
                  {seatUsage.admin.isFull && (
                    <span className="ml-1.5 text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">{t('subscription.full')}</span>
                  )}
                </span>
              </div>
              {/* Meter Checker seats */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-heading">{t('subscription.meterCheckers')}</span>
                <span className={`text-sm font-medium ${seatUsage.meter_checker.isFull ? 'text-red-600' : 'text-text-heading'}`}>
                  {seatUsage.meter_checker.used} / {seatUsage.meter_checker.limit}
                  {seatUsage.meter_checker.isFull && (
                    <span className="ml-1.5 text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">{t('subscription.full')}</span>
                  )}
                </span>
              </div>
              {/* Wells */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-heading">{t('subscription.wells')}</span>
                <span className={`text-sm font-medium ${wellCount >= tier.maxWells ? 'text-red-600' : 'text-text-heading'}`}>
                  {wellCount} / {tier.maxWells}
                  {wellCount >= tier.maxWells && (
                    <span className="ml-1.5 text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">{t('subscription.full')}</span>
                  )}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Loading state */}
        {!tier && (
          <div className="bg-surface-card rounded-lg p-3 mb-4 animate-pulse">
            <div className="h-4 bg-surface-page rounded w-24 mb-2" />
            <div className="h-3 bg-surface-page rounded w-full mb-1" />
            <div className="h-3 bg-surface-page rounded w-full mb-1" />
            <div className="h-3 bg-surface-page rounded w-full" />
          </div>
        )}

        {/* Manage Plan button -- visible only when URL is set and non-empty */}
        {subscriptionUrl && subscriptionUrl.trim() !== '' && farmId && tier && (
          <a
            href={buildSubscriptionUrl(subscriptionUrl, farmId, tier.slug)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center justify-center gap-2 w-full bg-surface-header text-white rounded-lg px-4 py-3 font-medium text-sm hover:bg-surface-header-hover transition-colors"
          >
            {t('subscription.managePlan')}
            <ArrowTopRightOnSquareIcon className="h-4 w-4" />
          </a>
        )}
      </div>
    </div>
  );
}
