import { useMemo } from 'react';
import distance from '@turf/distance';
import type { WellWithReading } from './useWells';

/**
 * Returns wells ordered by geographic proximity to the current well.
 * The current well is always at index 0, followed by nearest to farthest.
 *
 * If currentWellId is undefined, current well not found, or has no location,
 * returns wells array as-is (no reordering).
 */
export function useWellProximityOrder(
  currentWellId: string | undefined,
  wells: WellWithReading[],
): WellWithReading[] {
  return useMemo(() => {
    if (!currentWellId) return wells;

    const currentWell = wells.find((w) => w.id === currentWellId);
    if (!currentWell || !currentWell.location) return wells;

    const currentLng = currentWell.location.longitude;
    const currentLat = currentWell.location.latitude;

    const others = wells
      .filter((w) => w.id !== currentWellId && w.location !== null)
      .map((w) => ({
        well: w,
        dist: distance(
          [currentLng, currentLat],
          [w.location!.longitude, w.location!.latitude],
          { units: 'feet' as const },
        ),
      }))
      .sort((a, b) => a.dist - b.dist)
      .map((entry) => entry.well);

    return [currentWell, ...others];
  }, [currentWellId, wells]);
}
