import React from 'react';
import { ArrowLeftIcon, PencilSquareIcon } from '@heroicons/react/24/outline';
import { MapPinIcon } from '@heroicons/react/24/solid';
import { useTranslation } from '../hooks/useTranslation';
import type { WellWithReading } from '../hooks/useWells';

interface WellDetailHeaderProps {
  well: WellWithReading | null;
  farmName: string;
  proximityInRange: boolean | null;
  onClose: () => void;
  onEdit?: () => void;
}

const WellDetailHeader = React.memo(function WellDetailHeader({
  well,
  farmName,
  proximityInRange,
  onClose,
  onEdit,
}: WellDetailHeaderProps) {
  const { t } = useTranslation();

  if (!well) {
    return (
      <div className="relative h-56 bg-gray-800 flex items-center justify-center">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 left-4 flex items-center gap-1 text-white"
          aria-label="Back to map"
        >
          <ArrowLeftIcon className="w-5 h-5" />
          <span className="text-sm font-medium">{t('wellDetail.back')}</span>
        </button>
        <span className="text-white/60 text-sm">{t('well.wellNotFound')}</span>
      </div>
    );
  }

  // Build Mapbox Static Image URL for satellite background
  const mapUrl =
    well.location && import.meta.env.VITE_MAPBOX_TOKEN
      ? `https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/static/${well.location.longitude},${well.location.latitude},16,0/600x400@2x?access_token=${import.meta.env.VITE_MAPBOX_TOKEN}`
      : null;

  return (
    <div className="relative">
      {/* Satellite map background */}
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

      {/* Gradient overlay for text legibility */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-black/70" />

      {/* Overlay content */}
      <div className="absolute inset-0 flex flex-col">
        {/* Nav bar: Back / Edit */}
        <div className="flex items-center justify-between px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2">
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1.5 text-white bg-black/30 backdrop-blur-sm rounded-full px-3 py-1.5 active:opacity-70 transition-opacity"
            aria-label="Back to map"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            <span className="text-sm font-medium">{t('wellDetail.back')}</span>
          </button>
          {onEdit && (
            <button
              type="button"
              onClick={onEdit}
              className="flex items-center gap-1.5 text-white bg-black/30 backdrop-blur-sm rounded-full px-3 py-1.5 active:opacity-70 transition-opacity"
              aria-label="Edit well"
            >
              <PencilSquareIcon className="w-4 h-4" />
              <span className="text-sm font-medium">{t('wellDetail.edit')}</span>
            </button>
          )}
        </div>

        {/* Centered map pin */}
        <div className="flex-1 flex items-center justify-center">
          <MapPinIcon className="w-10 h-10 text-green-400 drop-shadow-lg" />
        </div>

        {/* Bottom bar: well info (left) + proximity (right) */}
        <div className="px-4 pb-4">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-white/70 text-xs">{farmName}</p>
              <h1 className="text-white text-3xl font-bold leading-tight">{well.name}</h1>
            </div>
            {proximityInRange !== null && (
              <span
                className={`text-sm font-semibold ${
                  proximityInRange ? 'text-green-400' : 'text-red-800'
                }`}
              >
                {proximityInRange ? t('wellDetail.inRangeOfWell') : t('wellDetail.outOfRange')}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

export default WellDetailHeader;
