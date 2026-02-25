import { useState, useCallback, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { MapIcon, PlusIcon, FlagIcon } from '@heroicons/react/24/solid';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { useWells, type WellWithReading } from '../hooks/useWells';
import WellListSkeleton from '../components/skeletons/WellListSkeleton';
import { useLatestReadings } from '../hooks/useLatestReadings';
import { useActiveFarm } from '../hooks/useActiveFarm';
import { useUserRole } from '../hooks/useUserRole';
import { hasPermission } from '../lib/permissions';
import { useSubscriptionTier } from '../hooks/useSubscriptionTier';
import { useWellCount } from '../hooks/useWellCount';
import { useAppSetting } from '../hooks/useAppSetting';
import { buildSubscriptionUrl } from '../lib/subscriptionUrls';
import { useCurrentAllocations } from '../hooks/useCurrentAllocations';
import { useWellSimilarFlags } from '../hooks/useWellFlags';
import { getWellFlagColor } from '../lib/wellFlags';
import { useTranslation } from '../hooks/useTranslation';
import WellLimitModal from '../components/WellLimitModal';

interface WellDisplayData {
  well: WellWithReading;
  formattedTime: string;
  remainingPercent: number;
  flagColor: 'orange' | 'yellow' | null;
}

function formatRelativeTime(latestReadingDate: string | null, t: (key: string, params?: Record<string, string | number>) => string): string {
  if (!latestReadingDate) return t('time.noReadings');

  const date = new Date(latestReadingDate);
  if (isNaN(date.getTime())) return t('time.noReadings');

  const diffDays = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return t('time.today');
  if (diffDays < 7) return t('time.daysAgo', { count: diffDays });
  if (diffDays < 30) return t('time.weeksAgo', { count: Math.floor(diffDays / 7) });
  return t('time.monthsAgo', { count: Math.floor(diffDays / 30) });
}

export default function WellListPage() {
  const { t } = useTranslation();
  const { wells, loading } = useWells();
  const navigate = useNavigate();
  const { farmId } = useActiveFarm();
  const { latestByWellId } = useLatestReadings(farmId);
  const { allocationsByWellId } = useCurrentAllocations(farmId);
  const similarWellIds = useWellSimilarFlags(farmId);
  const role = useUserRole();
  const canCreateWell = hasPermission(role, 'create_well');
  const tier = useSubscriptionTier();
  const wellCount = useWellCount();
  const subscriptionUrl = useAppSetting('subscription_website_url');
  const isOwner = role === 'owner' || role === 'super_admin';
  const upgradeUrl =
    subscriptionUrl && farmId && tier
      ? buildSubscriptionUrl(subscriptionUrl, farmId, tier.slug)
      : null;
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleWellClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      const id = e.currentTarget.dataset.wellId;
      if (id) navigate(`/wells/${id}`, { viewTransition: true });
    },
    [navigate],
  );
  const handleNewWell = useCallback(() => {
    if (tier && wellCount >= tier.maxWells) {
      setShowLimitModal(true);
      return;
    }
    navigate('/?action=new-well', { viewTransition: true });
  }, [tier, wellCount, navigate]);

  const handleLimitModalClose = useCallback(() => {
    setShowLimitModal(false);
  }, []);
  const handleWellMap = useCallback(() => navigate('/', { viewTransition: true }), [navigate]);

  const wellsWithDisplayData = useMemo<WellDisplayData[]>(
    () => wells.map((well) => {
      const allocation = allocationsByWellId.get(well.id);
      const usagePercent = allocation?.usagePercent ?? 0;
      return {
        well,
        formattedTime: formatRelativeTime(latestByWellId.get(well.id) ?? null, t),
        remainingPercent: allocation ? Math.max(0, 100 - usagePercent) : 0,
        flagColor: getWellFlagColor(well, similarWellIds.has(well.id)),
      };
    }),
    [wells, latestByWellId, allocationsByWellId, similarWellIds, t],
  );

  const filteredWells = useMemo(() => {
    if (!searchQuery.trim()) return wellsWithDisplayData;
    const query = searchQuery.toLowerCase();
    return wellsWithDisplayData.filter((item) =>
      item.well.name.toLowerCase().includes(query),
    );
  }, [wellsWithDisplayData, searchQuery]);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  }, []);

  // Fade transition from skeleton to real content
  const [showContent, setShowContent] = useState(!loading);
  useEffect(() => {
    if (!loading && !showContent) {
      requestAnimationFrame(() => setShowContent(true));
    }
  }, [loading, showContent]);

  if (loading) return <WellListSkeleton />;

  return (
    <div className={`min-h-screen bg-surface-page pt-14 transition-opacity duration-200 ${showContent ? 'opacity-100' : 'opacity-0'}`}>
      <div className="px-4 py-4">
        {/* Title */}
        <h1 className="text-2xl font-bold text-text-heading tracking-wide mb-4">{t('well.title')}</h1>

        {/* Search Input */}
        <div className="relative mb-4">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder={t('well.searchPlaceholder')}
            value={searchQuery}
            onChange={handleSearchChange}
            className="w-full pl-10 pr-4 py-3 bg-surface-input rounded-lg text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-text-heading/30"
          />
        </div>

        {/* Wells List */}
        <div className="space-y-2 mb-24">
          {filteredWells.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-text-heading/70">
                {searchQuery ? t('well.noSearchResults') : t('well.noWells')}
              </p>
            </div>
          ) : (
            filteredWells.map(({ well, formattedTime, remainingPercent, flagColor }) => (
              <button
                key={well.id}
                data-well-id={well.id}
                onClick={handleWellClick}
                className="w-full bg-surface-card rounded-lg px-4 py-3 text-left hover:bg-surface-card-hover transition-colors flex items-center gap-3"
              >
                {/* Well Name */}
                <span className="text-text-heading font-medium min-w-[70px]">{well.name}</span>

                {/* Allocation Gauge — gas gauge style */}
                <div className="flex-1 flex items-center gap-2">
                  <div className="flex-1 h-2 bg-surface-page rounded-full overflow-hidden">
                    {remainingPercent > 0 && (
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.max(remainingPercent, 4)}%`,
                          backgroundColor: '#5ac2c5',
                        }}
                      />
                    )}
                  </div>
                </div>

                {/* Last Reading Time */}
                <span className="text-sm text-text-heading/70 min-w-[80px] text-right">
                  {formattedTime}
                </span>

                {/* Flag indicator */}
                {flagColor && (
                  <FlagIcon
                    className={`w-4 h-4 ${flagColor === 'orange' ? 'text-orange-500' : 'text-yellow-400'}`}
                  />
                )}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Bottom Action Buttons */}
      <div className="fixed bottom-0 left-0 right-0 px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] bg-gradient-to-t from-surface-page via-surface-page to-transparent">
        <div className="flex justify-between gap-4">
          <button
            onClick={handleWellMap}
            className="flex items-center gap-2 px-5 py-3 bg-surface-input rounded-full text-text-heading font-medium shadow-sm hover:bg-surface-card transition-colors"
          >
            <MapIcon className="w-5 h-5" />
            {t('well.wellMap')}
          </button>
          {canCreateWell && (
            <button
              onClick={handleNewWell}
              className="flex items-center gap-2 px-5 py-3 bg-teal rounded-full text-white font-medium shadow-sm hover:bg-teal-hover transition-colors"
            >
              <PlusIcon className="w-5 h-5" />
              {t('well.newWell')}
            </button>
          )}
        </div>
      </div>

      {/* Well Limit Modal */}
      <WellLimitModal
        open={showLimitModal}
        onClose={handleLimitModalClose}
        upgradeUrl={upgradeUrl}
        isOwner={isOwner}
      />
    </div>
  );
}
