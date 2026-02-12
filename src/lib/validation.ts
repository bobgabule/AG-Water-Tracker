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
  if (!isWithinUSBounds(lat, lng)) {
    return 'Coordinates must be within the United States';
  }
  return null;
}
