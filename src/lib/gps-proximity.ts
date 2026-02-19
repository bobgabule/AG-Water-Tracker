import distance from '@turf/distance';

/**
 * 500 feet (~152.4 meters). Global threshold for all wells.
 * User decision: not configurable per-well.
 */
export const PROXIMITY_THRESHOLD_FEET = 500;

export interface Coords {
  lat: number;
  lng: number;
}

export interface WellCoords {
  latitude: number;
  longitude: number;
}

/**
 * Calculate the distance in feet between user coordinates and well coordinates.
 * Uses Haversine formula via @turf/distance.
 *
 * @param userCoords - User's GPS coordinates (lat/lng)
 * @param wellCoords - Well's coordinates (latitude/longitude)
 * @returns Distance in feet
 */
export function getDistanceToWell(
  userCoords: Coords,
  wellCoords: WellCoords,
): number {
  return distance(
    [userCoords.lng, userCoords.lat],
    [wellCoords.longitude, wellCoords.latitude],
    { units: 'feet' },
  );
}

/**
 * Check whether a pre-calculated distance is within the proximity threshold.
 *
 * @param distanceFeet - Distance in feet (from getDistanceToWell)
 * @returns true if within 500 feet
 */
export function isInRange(distanceFeet: number): boolean {
  return distanceFeet <= PROXIMITY_THRESHOLD_FEET;
}
