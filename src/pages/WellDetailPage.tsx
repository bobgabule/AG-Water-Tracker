import { useParams, useNavigate } from 'react-router';
import { useState, useCallback, useMemo } from 'react';
import { useWells } from '../hooks/useWells';
import { useAuth } from '../lib/AuthProvider';
import { useUserRole } from '../hooks/useUserRole';
import { hasPermission } from '../lib/permissions';
import WellDetailSheet from '../components/WellDetailSheet';
import NewReadingSheet from '../components/NewReadingSheet';

export default function WellDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { wells } = useWells();
  const { onboardingStatus, user } = useAuth();
  const farmName = onboardingStatus?.farmName ?? '';
  const farmId = onboardingStatus?.farmId ?? '';

  const role = useUserRole();
  const canEdit = hasPermission(role, 'edit_well');

  const [readingSheetOpen, setReadingSheetOpen] = useState(false);

  const currentWell = useMemo(
    () => wells.find((w) => w.id === id) ?? null,
    [wells, id],
  );

  const handleClose = useCallback(() => navigate('/'), [navigate]);
  const handleEdit = useCallback(
    () => id && navigate(`/wells/${id}/edit`),
    [navigate, id],
  );
  const handleNewReading = useCallback(() => setReadingSheetOpen(true), []);
  const handleReadingClose = useCallback(() => setReadingSheetOpen(false), []);

  return (
    <>
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
    </>
  );
}
