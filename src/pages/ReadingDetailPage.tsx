import { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router';
import { ArrowLeftIcon, TrashIcon } from '@heroicons/react/24/outline';
import { MapPinIcon } from '@heroicons/react/24/solid';
import PennantFlagIcon from '../components/PennantFlagIcon';
import { useWells } from '../hooks/useWells';
import { useWellReadingsWithNames } from '../hooks/useWellReadingsWithNames';
import { useActiveFarm } from '../hooks/useActiveFarm';
import { useUserRole } from '../hooks/useUserRole';
import { useFarmReadOnly } from '../hooks/useFarmReadOnly';
import { useTranslation } from '../hooks/useTranslation';
import { hasPermission } from '../lib/permissions';
import { getDistanceToWell } from '../lib/gps-proximity';
import { useToastStore } from '../stores/toastStore';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { supabase } from '../lib/supabase';
import { calculateUsageAf } from '../lib/usage-calculation';
import ConfirmDialog from '../components/ConfirmDialog';

export default function ReadingDetailPage() {
  const { id, readingId } = useParams<{ id: string; readingId: string }>();
  const navigate = useNavigate();
  const isOnline = useOnlineStatus();
  const { t, locale } = useTranslation();
  const { wells, loading: wellsLoading } = useWells();
  const { farmName: activeFarmName } = useActiveFarm();
  const farmName = activeFarmName ?? '';
  const role = useUserRole();
  const { isReadOnly } = useFarmReadOnly();
  const canDelete = hasPermission(role, 'delete_reading');

  const { readings, loading: readingsLoading } = useWellReadingsWithNames(id ?? null);

  const well = useMemo(
    () => wells.find((w) => w.id === id) ?? null,
    [wells, id],
  );

  const reading = useMemo(
    () => readings.find((r) => r.id === readingId) ?? null,
    [readings, readingId],
  );

  // Only redirect after data has loaded at least once (prevents false redirect on cold start)
  const hasLoaded = useRef(false);
  useEffect(() => {
    if (!wellsLoading && !readingsLoading) {
      hasLoaded.current = true;
    }
    if (hasLoaded.current && !reading) {
      navigate(id ? `/wells/${id}` : '/', { replace: true });
    }
  }, [wellsLoading, readingsLoading, reading, navigate, id]);

  // Mapbox static satellite image
  const mapUrl = useMemo(() => {
    if (!well?.location || !import.meta.env.VITE_MAPBOX_TOKEN) return null;
    return `https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/static/${well.location.longitude},${well.location.latitude},16,0/600x400@2x?access_token=${import.meta.env.VITE_MAPBOX_TOKEN}`;
  }, [well?.location]);

  // GPS distance between reading location and well location
  const gpsDistanceFeet = useMemo(() => {
    if (
      !reading?.gpsLatitude ||
      !reading?.gpsLongitude ||
      !well?.location
    )
      return null;
    const dist = getDistanceToWell(
      { lat: reading.gpsLatitude, lng: reading.gpsLongitude },
      { latitude: well.location.latitude, longitude: well.location.longitude },
    );
    return Math.round(dist);
  }, [reading?.gpsLatitude, reading?.gpsLongitude, well?.location]);

  // Formatted title: "Well Name - Month Day"
  const titleDate = useMemo(() => {
    if (!well || !reading) return '';
    const date = new Date(reading.recordedAt);
    const monthDay = date.toLocaleDateString(locale, {
      month: 'long',
      day: 'numeric',
    });
    return `${well.name} - ${monthDay}`;
  }, [well, reading, locale]);

  // Formatted date for detail field: "June 19, 2025 at 2:00 PM"
  const formattedDate = useMemo(() => {
    if (!reading) return '';
    const date = new Date(reading.recordedAt);
    const dateStr = date.toLocaleDateString(locale, {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
    const timeStr = date.toLocaleTimeString(locale, {
      hour: 'numeric',
      minute: '2-digit',
    });
    return t('time.dateAt', { date: dateStr, time: timeStr });
  }, [reading, locale, t]);

  // Short date for delete confirm message
  const readingDate = useMemo(() => {
    if (!reading) return '';
    return new Date(reading.recordedAt).toLocaleDateString(locale, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }, [reading, locale]);

  // Delete state
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleBack = useCallback(
    () => navigate(`/wells/${id}`, { viewTransition: true }),
    [navigate, id],
  );

  const handleDelete = useCallback(async () => {
    if (isReadOnly) return;
    if (!readingId || !reading || !well) return;
    if (!isOnline) {
      useToastStore.getState().show(t('common.requiresInternet'), 'error');
      return;
    }
    setDeleting(true);
    try {
      const { error } = await supabase.from('readings').delete().eq('id', readingId);
      if (error) throw error;

      // Recalculate used_af on affected allocation (fire-and-forget)
      try {
        const deletedDate = reading.recordedAt.split('T')[0];

        const { data: allocData } = await supabase
          .from('allocations')
          .select('id, starting_reading, period_start, period_end')
          .eq('well_id', well.id)
          .lte('period_start', deletedDate)
          .gte('period_end', deletedDate)
          .order('period_start', { ascending: false })
          .limit(1);

        if (allocData && allocData.length > 0) {
          const alloc = allocData[0];

          const { data: latestReadings } = await supabase
            .from('readings')
            .select('value')
            .eq('well_id', well.id)
            .gte('recorded_at', alloc.period_start)
            .lte('recorded_at', alloc.period_end + 'T23:59:59')
            .order('recorded_at', { ascending: false })
            .limit(1);

          if (!alloc.starting_reading) {
            // No starting_reading — can't recalculate, preserve existing used_af
          } else if (!latestReadings?.length) {
            // No readings left in period — zero out usage
            await supabase
              .from('allocations')
              .update({
                used_af: 0,
                updated_at: new Date().toISOString(),
              })
              .eq('id', alloc.id);
          } else {
            const newUsedAf = calculateUsageAf(
              latestReadings[0].value,
              alloc.starting_reading,
              well.multiplier,
              well.units,
            );
            await supabase
              .from('allocations')
              .update({
                used_af: Math.round(newUsedAf * 100) / 100,
                updated_at: new Date().toISOString(),
              })
              .eq('id', alloc.id);
          }
        }
      } catch {
        // Allocation recalculation is non-critical; reading was already deleted
      }

      useToastStore.getState().show(t('reading.deleted'));
      setShowDeleteConfirm(false);
      navigate(`/wells/${id}`, { viewTransition: true, replace: true });
    } catch {
      useToastStore.getState().show(t('reading.deleteFailed'), 'error');
    } finally {
      setDeleting(false);
    }
  }, [readingId, reading, well, isOnline, navigate, id, t, isReadOnly]);

  const handleOpenDelete = useCallback(() => setShowDeleteConfirm(true), []);
  const handleCloseDelete = useCallback(() => setShowDeleteConfirm(false), []);

  // Loading / not found
  if (wellsLoading || readingsLoading || !reading || !well) {
    return <div className="fixed inset-0 bg-surface-dark" />;
  }

  return (
    <>
      <div className="fixed inset-0 z-40 flex flex-col bg-surface-dark">
        {/* Satellite map header */}
        <div className="relative flex-shrink-0">
          {mapUrl ? (
            <img
              src={mapUrl}
              alt={`Satellite view of ${well.name}`}
              className="w-full h-56 object-cover"
              draggable={false}
            />
          ) : (
            <div className="w-full h-56 bg-gray-800" />
          )}

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-black/70" />

          {/* Overlay content */}
          <div className="absolute inset-0 flex flex-col">
            {/* Back button */}
            <div className="px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2">
              <button
                type="button"
                onClick={handleBack}
                className="flex items-center gap-1.5 text-white bg-black/30 backdrop-blur-sm rounded-full px-3 py-1.5 active:opacity-70 transition-opacity"
                aria-label={t('readingDetail.back')}
              >
                <ArrowLeftIcon className="w-4 h-4" />
                <span className="text-sm font-medium">{t('readingDetail.back')}</span>
              </button>
            </div>

            {/* Centered green pin */}
            <div className="flex-1 flex items-center justify-center">
              <MapPinIcon className="w-10 h-10 text-green-400 drop-shadow-lg" />
            </div>

            {/* Farm name + title at bottom of map */}
            <div className="px-4 pb-4">
              <p className="text-white/70 text-xs">{farmName}</p>
              <h1 className="text-white text-3xl font-bold leading-tight">{titleDate}</h1>
            </div>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto min-h-0 px-4 pt-4">
          {/* Warning banners */}
          <div className="space-y-2 mb-6 mx-4">
            {!reading.isInRange && gpsDistanceFeet !== null && (
              <div className="flex items-center gap-3 bg-[#4b5b37] rounded-xl px-8 py-4">
                <PennantFlagIcon className="w-5 h-5 text-yellow-400 flex-shrink-0" />
                <span className="text-[#d5e8bd] text-lg">
                  {t('readingDetail.gpsOffBy', { feet: gpsDistanceFeet })}
                </span>
              </div>
            )}
            {reading.isSimilarReading && (
              <div className="flex items-center gap-3 bg-[#4b5b37] rounded-xl px-8 py-4">
                <PennantFlagIcon className="w-5 h-5 text-orange-400 flex-shrink-0" />
                <span className="text-[#d5e8bd] text-lg">
                  {t('readingDetail.similarReading')}
                </span>
              </div>
            )}
          </div>

          {/* Detail fields */}
          <div className="space-y-6 px-4">
            {/* DATE */}
            <div>
              <p className="text-[#acbc97] text-lg font-semibold uppercase tracking-wide mb-1">
                {t('readingDetail.dateLabel')}
              </p>
              <p className="text-[#d5e8bd] text-lg">{formattedDate}</p>
            </div>

            {/* Meter Reading */}
            <div>
              <p className="text-[#acbc97] text-lg font-semibold uppercase tracking-wide mb-1">
                {t('readingDetail.meterReading')}
              </p>
              <p className="text-[#d5e8bd] text-lg">{reading.value}</p>
            </div>

            {/* SUBMITTED BY */}
            <div>
              <p className="text-[#acbc97] text-lg font-semibold uppercase tracking-wide mb-1">
                {t('readingDetail.submittedBy')}
              </p>
              <p className="text-[#d5e8bd] text-lg">{reading.recorderName}</p>
            </div>
          </div>
        </div>

        {/* Delete button (admin/owner only) */}
        {canDelete && !isReadOnly && (
          <div className="flex-shrink-0 px-4 py-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
            <button
              type="button"
              onClick={handleOpenDelete}
              className="w-full py-3 bg-red-800 text-white font-medium text-lg uppercase rounded-full flex items-center justify-center gap-2 active:opacity-70 transition-opacity"
            >
              <TrashIcon className="w-5 h-5" />
              {t('readingDetail.deleteReading')}
            </button>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={showDeleteConfirm}
        onClose={handleCloseDelete}
        onConfirm={handleDelete}
        title={t('confirm.delete')}
        description={t('reading.deleteConfirm', { value: reading.value, date: readingDate })}
        confirmText={t('confirm.delete')}
        confirmLoadingText={t('confirm.deleting')}
        loading={deleting}
      />
    </>
  );
}
