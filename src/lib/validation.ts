// Flip to true when the app goes live
export const ENFORCE_US_BOUNDS = false;

export const US_COORDINATE_BOUNDS = {
  lat: { min: 18, max: 72 },
  lng: { min: -180, max: -66 },
} as const;

export function isWithinUSBounds(lat: number, lng: number): boolean {
  return (
    lat >= US_COORDINATE_BOUNDS.lat.min &&
    lat <= US_COORDINATE_BOUNDS.lat.max &&
    lng >= US_COORDINATE_BOUNDS.lng.min &&
    lng <= US_COORDINATE_BOUNDS.lng.max
  );
}

export function getCoordinateValidationError(lat: number, lng: number): string | null {
  if (isNaN(lat) || isNaN(lng)) return 'Invalid coordinates';
  if (lat < -90 || lat > 90) return 'Latitude must be between -90 and 90';
  if (lng < -180 || lng > 180) return 'Longitude must be between -180 and 180';
  if (ENFORCE_US_BOUNDS && !isWithinUSBounds(lat, lng)) {
    return 'Coordinates must be within the United States';
  }
  return null;
}

/**
 * Checks if a well name is unique among farm wells.
 * Case-insensitive comparison with trimmed values.
 * Excludes the well being edited (by excludeId) from the check.
 */
export function isWellNameUnique(
  name: string,
  farmWells: { id: string; name: string }[],
  excludeId?: string
): boolean {
  const normalized = name.trim().toLowerCase();
  return !farmWells.some(
    (w) => w.id !== excludeId && w.name.trim().toLowerCase() === normalized
  );
}

/**
 * Checks if a WMIS number is unique among farm wells.
 * Empty/blank WMIS values are always considered unique (skip validation).
 * Case-insensitive comparison with trimmed values.
 * Excludes the well being edited (by excludeId) from the check.
 */
export function isWmisUnique(
  wmis: string,
  farmWells: { id: string; wmisNumber: string | null }[],
  excludeId?: string
): boolean {
  const normalized = wmis.trim().toLowerCase();
  if (normalized === '') return true;
  return !farmWells.some(
    (w) =>
      w.id !== excludeId &&
      w.wmisNumber != null &&
      w.wmisNumber.trim().toLowerCase() === normalized
  );
}
