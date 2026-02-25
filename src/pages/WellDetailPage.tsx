import { useParams, useNavigate } from 'react-router';
import { useState, useCallback, useMemo, useEffect } from 'react';
import { useWells } from '../hooks/useWells';
import { useAuth } from '../lib/AuthProvider';
import { useActiveFarm } from '../hooks/useActiveFarm';
import { useUserRole } from '../hooks/useUserRole';
import { hasPermission } from '../lib/permissions';
import WellDetailSheet from '../components/WellDetailSheet';
import NewReadingSheet from '../components/NewReadingSheet';
import WellDetailSkeleton from '../components/skeletons/WellDetailSkeleton';

export default function WellDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { wells, loading } = useWells();
  const { user } = useAuth();
  const { farmId: activeFarmId, farmName: activeFarmName } = useActiveFarm();
  const farmName = activeFarmName ?? '';
  const farmId = activeFarmId ?? '';

  const role = useUserRole();
  const canEdit = hasPermission(role, 'edit_well');

  const [readingSheetOpen, setReadingSheetOpen] = useState(false);

  // Fade transition from skeleton to real content
  const [showContent, setShowContent] = useState(!loading);
  useEffect(() => {
    if (!loading && !showContent) {
      requestAnimationFrame(() => setShowContent(true));
    }
  }, [loading, showContent]);

  const currentWell = useMemo(
    () => wells.find((w) => w.id === id) ?? null,
    [wells, id],
  );

  const handleClose = useCallback(() => navigate('/', { viewTransition: true }), [navigate]);
  const handleEdit = useCallback(
    () => id && navigate(`/wells/${id}/edit`, { viewTransition: true }),
    [navigate, id],
  );
  const handleNewReading = useCallback(() => setReadingSheetOpen(true), []);
  const handleReadingClose = useCallback(() => setReadingSheetOpen(false), []);

  // Show skeleton while wells data is loading
  if (loading) return <WellDetailSkeleton />;

  return (
    <div className={`transition-opacity duration-200 ${showContent ? 'opacity-100' : 'opacity-0'}`}>
      <WellDetailSheet
        well={currentWell}
        farmName={farmName}
        onClose={handleClose}
        onEdit={canEdit ? handleEdit : undefined}
        onNewReading={handleNewReading}
      />
      {readingSheetOpen && currentWell && user && farmId && (
        <NewReadingSheet
          open={readingSheetOpen}
          onClose={handleReadingClose}
          well={currentWell}
          farmId={farmId}
          userId={user.id}
        />
      )}
    </div>
  );
}
