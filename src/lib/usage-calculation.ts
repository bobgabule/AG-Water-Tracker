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

/**
 * Calculates total usage in acre-feet for an allocation period,
 * handling any number of meter replacement boundaries.
 *
 * Entries are processed newest-first. Each meter_replacement entry marks a
 * segment boundary: usage in a segment = (segment latest reading - segment baseline).
 * The oldest segment uses the allocation's starting_reading as baseline.
 *
 * @param entries All readings + meter_replacements in the period, sorted by recorded_at DESC
 * @param startingReading The allocation's starting_reading (baseline for the oldest segment)
 * @param multiplier Well's multiplier value
 * @param units Well's unit type
 * @returns Usage in acre-feet (always >= 0)
 */
export function calculateAllocationUsage(
  entries: { value: string; type: string }[],
  startingReading: string,
  multiplier: string,
  units: string,
): number {
  let total = 0;
  let segmentLatest: string | null = null;

  for (const entry of entries) {
    if (entry.type === 'meter_replacement') {
      // This replacement's value is the new meter's starting point (baseline for the newer segment)
      if (segmentLatest !== null) {
        total += calculateUsageAf(segmentLatest, entry.value, multiplier, units);
      }
      segmentLatest = null; // reset — next older readings belong to the previous segment
    } else {
      // Normal reading
      if (segmentLatest === null) {
        segmentLatest = entry.value; // latest reading in this segment
      }
    }
  }

  // Oldest segment: use allocation's starting_reading as baseline
  if (segmentLatest !== null) {
    total += calculateUsageAf(segmentLatest, startingReading, multiplier, units);
  }

  return total;
}
