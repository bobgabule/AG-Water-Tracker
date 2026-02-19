/**
 * Usage calculation utility for converting meter readings to acre-feet.
 *
 * Usage formula:
 *   diff = latestReading - startingReading
 *   rawUsage = diff * multiplierValue
 *   usageAf = rawUsage * conversionFactor
 */

/** Conversion factors from native units to acre-feet */
export const CONVERSION_TO_AF: Record<string, number> = {
  AF: 1,
  GAL: 1 / 325851,
  CF: 1 / 43560,
};

/**
 * Returns the numeric multiplier value for a given multiplier string.
 * 'MG' (million gallons) maps to 1,000,000. Others are parsed as floats.
 */
export function getMultiplierValue(multiplier: string): number {
  if (multiplier === 'MG') return 1_000_000;
  const parsed = parseFloat(multiplier);
  return isNaN(parsed) ? 1 : parsed;
}

/**
 * Calculates water usage in acre-feet from meter readings.
 *
 * @param latestReading - The most recent meter reading value (as string)
 * @param startingReading - The baseline meter reading value (as string)
 * @param multiplier - Meter multiplier ('0.01', '1', '10', '1000', 'MG')
 * @param units - Unit of measurement ('AF', 'GAL', 'CF')
 * @returns Usage in acre-feet (always >= 0)
 */
export function calculateUsageAf(
  latestReading: string,
  startingReading: string,
  multiplier: string,
  units: string
): number {
  const latest = parseFloat(latestReading);
  const starting = parseFloat(startingReading);

  // Handle NaN inputs gracefully
  if (isNaN(latest) || isNaN(starting)) return 0;

  const diff = latest - starting;
  if (diff <= 0) return 0;

  const rawUsage = diff * getMultiplierValue(multiplier);
  return rawUsage * (CONVERSION_TO_AF[units] ?? 1);
}
