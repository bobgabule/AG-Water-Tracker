import { useMemo } from 'react';
import { useQuery } from '@powersync/react';
import { ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../lib/AuthProvider';
import { useAppSetting } from '../hooks/useAppSetting';
import { useSeatUsage } from '../hooks/useSeatUsage';
import { useSubscriptionTier } from '../hooks/useSubscriptionTier';

export default function SubscriptionPage() {
  const { onboardingStatus } = useAuth();
  const farmId = onboardingStatus?.farmId ?? null;

  const tier = useSubscriptionTier();
  const seatUsage = useSeatUsage();

  // Well count query -- only count active wells against the tier limit
  const wellCountQuery = farmId
    ? `SELECT COUNT(*) as count FROM wells WHERE farm_id = ? AND status = 'active'`
    : 'SELECT NULL WHERE 0';

  const { data: wellCountData } = useQuery<{ count: number }>(
    wellCountQuery,
    farmId ? [farmId] : []
  );

  const wellCount = useMemo(
    () => wellCountData?.[0]?.count ?? 0,
    [wellCountData]
  );

  // Subscription management URL from app_settings
  const subscriptionUrl = useAppSetting('subscription_website_url');

  return (
    <div className="min-h-screen bg-[#c5cdb4] pt-14">
      <div className="px-4 py-4">
        <h1 className="text-2xl font-bold text-[#5f7248] tracking-wide mb-4">SUBSCRIPTION</h1>

        {/* Seat and well usage summary */}
        {tier && seatUsage && (
          <div className="bg-[#dfe4d4] rounded-lg p-3 mb-4">
            <h2 className="text-xs font-semibold text-[#5f7248]/70 uppercase tracking-wider mb-2">
              {tier.displayName}
            </h2>
            <div className="space-y-1">
              {/* Admin seats */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#5f7248]">Admins</span>
                <span className={`text-sm font-medium ${seatUsage.admin.isFull ? 'text-red-600' : 'text-[#5f7248]'}`}>
                  {seatUsage.admin.used} / {seatUsage.admin.limit}
                  {seatUsage.admin.isFull && (
                    <span className="ml-1.5 text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">Full</span>
                  )}
                </span>
              </div>
              {/* Meter Checker seats */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#5f7248]">Meter Checkers</span>
                <span className={`text-sm font-medium ${seatUsage.meter_checker.isFull ? 'text-red-600' : 'text-[#5f7248]'}`}>
                  {seatUsage.meter_checker.used} / {seatUsage.meter_checker.limit}
                  {seatUsage.meter_checker.isFull && (
                    <span className="ml-1.5 text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">Full</span>
                  )}
                </span>
              </div>
              {/* Wells */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#5f7248]">Wells</span>
                <span className={`text-sm font-medium ${wellCount >= tier.maxWells ? 'text-red-600' : 'text-[#5f7248]'}`}>
                  {wellCount} / {tier.maxWells}
                  {wellCount >= tier.maxWells && (
                    <span className="ml-1.5 text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">Full</span>
                  )}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Loading state */}
        {!tier && (
          <div className="bg-[#dfe4d4] rounded-lg p-3 mb-4 animate-pulse">
            <div className="h-4 bg-[#c5cdb4] rounded w-24 mb-2" />
            <div className="h-3 bg-[#c5cdb4] rounded w-full mb-1" />
            <div className="h-3 bg-[#c5cdb4] rounded w-full mb-1" />
            <div className="h-3 bg-[#c5cdb4] rounded w-full" />
          </div>
        )}

        {/* Manage Plan button -- visible only when URL is set and non-empty */}
        {subscriptionUrl && subscriptionUrl.trim() !== '' && farmId && (
          <a
            href={`${subscriptionUrl}${subscriptionUrl.includes('?') ? '&' : '?'}farm_id=${farmId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center justify-center gap-2 w-full bg-[#5f7248] text-white rounded-lg px-4 py-3 font-medium text-sm hover:bg-[#4e6339] transition-colors"
          >
            Manage Plan
            <ArrowTopRightOnSquareIcon className="h-4 w-4" />
          </a>
        )}
      </div>
    </div>
  );
}
