import { useParams, useNavigate } from 'react-router';
import { useCallback } from 'react';
import { useWells } from '../hooks/useWells';
import { useAuth } from '../lib/AuthProvider';
import WellDetailSheet from '../components/WellDetailSheet';

export default function WellDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { wells } = useWells();
  const { onboardingStatus } = useAuth();
  const farmName = onboardingStatus?.farmName ?? '';

  const handleClose = useCallback(() => navigate('/'), [navigate]);
  const handleEdit = useCallback(() => navigate(`/wells/${id}/edit`), [navigate, id]);
  const handleWellChange = useCallback(
    (wellId: string) => navigate(`/wells/${wellId}`, { replace: true }),
    [navigate],
  );

  return (
    <WellDetailSheet
      wellId={id!}
      wells={wells}
      farmName={farmName}
      onClose={handleClose}
      onEdit={handleEdit}
      onWellChange={handleWellChange}
    />
  );
}
