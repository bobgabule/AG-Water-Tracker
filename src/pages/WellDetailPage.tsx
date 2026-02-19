import { useParams, useNavigate } from 'react-router';
import { useState, useCallback } from 'react';
import { useWells } from '../hooks/useWells';
import { useAuth } from '../lib/AuthProvider';
import WellDetailSheet from '../components/WellDetailSheet';
import NewReadingSheet from '../components/NewReadingSheet';

export default function WellDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { wells } = useWells();
  const { onboardingStatus, user } = useAuth();
  const farmName = onboardingStatus?.farmName ?? '';
  const farmId = onboardingStatus?.farmId ?? '';

  const [readingSheetOpen, setReadingSheetOpen] = useState(false);

  const currentWell = wells.find((w) => w.id === id) ?? null;

  const handleClose = useCallback(() => navigate('/'), [navigate]);
  const handleEdit = useCallback(() => navigate(`/wells/${id}/edit`), [navigate, id]);
  const handleWellChange = useCallback(
    (wellId: string) => navigate(`/wells/${wellId}`, { replace: true }),
    [navigate],
  );
  const handleNewReading = useCallback(() => setReadingSheetOpen(true), []);
  const handleReadingClose = useCallback(() => setReadingSheetOpen(false), []);

  return (
    <>
      <WellDetailSheet
        wellId={id!}
        wells={wells}
        farmName={farmName}
        onClose={handleClose}
        onEdit={handleEdit}
        onWellChange={handleWellChange}
        onNewReading={handleNewReading}
      />
      {readingSheetOpen && currentWell && user && (
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
