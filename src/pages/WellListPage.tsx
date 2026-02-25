import { useState, useCallback, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { MapIcon, PlusIcon, PlayIcon } from '@heroicons/react/24/solid';
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
import WellLimitModal from '../components/WellLimitModal';

// Date threshold constants (in days)
const RECENT_THRESHOLD = 3;
const WEEK_THRESHOLD = 7;
const TWO_WEEKS_THRESHOLD = 14;
const MONTH_THRESHOLD = 30;

interface WellDisplayData {
  well: WellWithReading;
  diffDays: number | null;
  formattedTime: string;
  statusColor: string;
  statusWidth: string;
}

function computeWellDisplayData(
  well: WellWithReading,
  latestReadingDate: string | null,
): WellDisplayData {
  const { status } = well;

  // Parse date and compute diff using actual reading date
  let diffDays: number | null = null;
  if (latestReadingDate) {
    const date = new Date(latestReadingDate);
    if (!isNaN(date.getTime())) {
      const now = new Date();
      diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    }
  }

  // Format relative time
  let formattedTime = 'No readings';
  if (diffDays !== null) {
    if (diffDays === 0) formattedTime = 'Today';
    else if (diffDays === 1) formattedTime = '1 day ago';
    else if (diffDays < WEEK_THRESHOLD) formattedTime = `${diffDays} days ago`;
    else if (diffDays < TWO_WEEKS_THRESHOLD) formattedTime = '1 week ago';
    else if (diffDays < MONTH_THRESHOLD) formattedTime = `${Math.floor(diffDays / 7)} weeks ago`;
    else if (diffDays < 60) formattedTime = '1 month ago';
    else formattedTime = `${Math.floor(diffDays / 30)} months ago`;
  }

  // Determine status color
  let statusColor = 'bg-gray-300';
  if (status === 'critical' || status === 'alert') {
    statusColor = 'bg-red-500';
  } else if (status === 'warning') {
    statusColor = 'bg-orange-400';
  } else if (diffDays !== null) {
    if (diffDays <= RECENT_THRESHOLD) statusColor = 'bg-teal';
    else if (diffDays <= WEEK_THRESHOLD) statusColor = 'bg-teal-light';
    else if (diffDays <= TWO_WEEKS_THRESHOLD) statusColor = 'bg-yellow-400';
    else statusColor = 'bg-gray-400';
  }

  // Determine status bar width
  let statusWidth = 'w-1/4';
  if (diffDays !== null) {
    if (diffDays === 0) statusWidth = 'w-full';
    else if (diffDays <= 1) statusWidth = 'w-3/4';
    else if (diffDays <= RECENT_THRESHOLD) statusWidth = 'w-2/3';
    else if (diffDays <= WEEK_THRESHOLD) statusWidth = 'w-1/2';
    else if (diffDays <= TWO_WEEKS_THRESHOLD) statusWidth = 'w-1/3';
  }

  return { well, diffDays, formattedTime, statusColor, statusWidth };
}

export default function WellListPage() {
  const { wells, loading } = useWells();
  const navigate = useNavigate();
  const { farmId } = useActiveFarm();
  const { latestByWellId } = useLatestReadings(farmId);
  const role = useUserRole();
  const canCreateWell = hasPermission(role, 'create_well');
  const tier = useSubscriptionTier();
  const wellCount = useWellCount();
  const subscriptionUrl = useAppSetting('subscription_website_url');
  const isGrower = role === 'grower' || role === 'super_admin';
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
    // Allow creation if tier data hasn't loaded (offline edge case)
    if (tier && wellCount >= tier.maxWells) {
      setShowLimitModal(true);
      return;
    }
    navigate('/wells/new', { viewTransition: true });
  }, [tier, wellCount, navigate]);

  const handleLimitModalClose = useCallback(() => {
    setShowLimitModal(false);
  }, []);
  const handleWellMap = useCallback(() => navigate('/', { viewTransition: true }), [navigate]);

  const wellsWithDisplayData = useMemo(
    () => wells.map((well) =>
      computeWellDisplayData(well, latestByWellId.get(well.id) ?? null)
    ),
    [wells, latestByWellId],
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
        <h1 className="text-2xl font-bold text-text-heading tracking-wide mb-4">WELLS</h1>

        {/* Search Input */}
        <div className="relative mb-4">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Find a well"
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
                {searchQuery ? 'No wells match your search' : 'No wells found'}
              </p>
            </div>
          ) : (
            filteredWells.map(({ well, formattedTime, statusColor, statusWidth }) => (
              <button
                key={well.id}
                data-well-id={well.id}
                onClick={handleWellClick}
                className="w-full bg-surface-card rounded-lg px-4 py-3 text-left hover:bg-surface-card-hover transition-colors flex items-center gap-3"
              >
                {/* Well Name */}
                <span className="text-text-heading font-medium min-w-[70px]">{well.name}</span>

                {/* Status Bar */}
                <div className="flex-1 flex items-center gap-2">
                  <div className="flex-1 h-2 bg-surface-page rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${statusColor} ${statusWidth}`} />
                  </div>
                </div>

                {/* Last Reading Time */}
                <span className="text-sm text-text-heading/70 min-w-[80px] text-right">
                  {formattedTime}
                </span>

                {/* Alert indicator for wells needing attention */}
                {well.status === 'alert' && (
                  <PlayIcon className="w-4 h-4 text-orange-500 rotate-90" />
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
            Well Map
          </button>
          {canCreateWell && (
            <button
              onClick={handleNewWell}
              className="flex items-center gap-2 px-5 py-3 bg-teal rounded-full text-white font-medium shadow-sm hover:bg-teal-hover transition-colors"
            >
              <PlusIcon className="w-5 h-5" />
              New Well
            </button>
          )}
        </div>
      </div>

      {/* Well Limit Modal */}
      <WellLimitModal
        open={showLimitModal}
        onClose={handleLimitModalClose}
        upgradeUrl={upgradeUrl}
        isGrower={isGrower}
      />
    </div>
  );
}
