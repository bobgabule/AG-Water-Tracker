/**
 * Determine flag color for a well based on hardware status and similar reading.
 * Orange = any hardware not Ok (battery, pump, or meter) — higher severity.
 * Yellow = latest reading flagged as similar to prior reading.
 */
export function getWellFlagColor(
  well: { batteryState: string; pumpState: string; meterStatus: string },
  hasSimilarReading: boolean,
): 'orange' | 'yellow' | null {
  if (well.batteryState !== 'Ok' || well.pumpState !== 'Ok' || well.meterStatus !== 'Ok') {
    return 'orange';
  }
  if (hasSimilarReading) return 'yellow';
  return null;
}
