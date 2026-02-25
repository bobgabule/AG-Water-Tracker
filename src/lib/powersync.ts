import { PowerSyncDatabase } from '@powersync/web';
import { AppSchema } from './powersync-schema.ts';
import { SupabaseConnector } from './powersync-connector.ts';
import { debugLog } from './debugLog';

let powerSyncInstance: PowerSyncDatabase | null = null;
let initPromise: Promise<PowerSyncDatabase> | null = null;

/** Pre-warm: start WASM load + SQLite init in parallel with auth. */
export function preWarmPowerSync(): void {
  if (!initPromise) {
    initPromise = setupPowerSync();
  }
}

export function setupPowerSync(): Promise<PowerSyncDatabase> {
  if (powerSyncInstance) return Promise.resolve(powerSyncInstance);
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      const connector = new SupabaseConnector();

      const db = new PowerSyncDatabase({
        schema: AppSchema,
        database: {
          dbFilename: 'ag-water-tracker.db',
        },
        flags: {
          useWebWorker: false,
        },
      });

      await db.init();

      // Connect in background — db is usable for local queries after init().
      // Remote sync starts asynchronously; no need to block the UI.
      db.connect(connector).catch((err) => {
        debugLog('PowerSync', 'Background connect error (will auto-retry):', err);
      });

      // Add sync status listener for debugging
      db.registerListener({
        statusChanged: (status) => {
          debugLog('PowerSync', 'Status changed:', {
            connected: status.connected,
            lastSyncedAt: status.lastSyncedAt,
            dataFlowStatus: status.dataFlowStatus,
          });
        },
      });

      // Log initial status
      const status = db.currentStatus;
      debugLog('PowerSync', 'Initial status:', {
        connected: status?.connected,
        lastSyncedAt: status?.lastSyncedAt,
        hasSynced: status?.hasSynced,
      });

      powerSyncInstance = db;
      return db;
    } catch (err) {
      // Reset so subsequent calls can retry instead of returning a rejected promise
      initPromise = null;
      throw err;
    }
  })();

  return initPromise;
}

export function getPowerSyncInstance(): PowerSyncDatabase | null {
  return powerSyncInstance;
}

export async function disconnectAndClear(): Promise<void> {
  initPromise = null; // Cancel in-flight pre-warm
  if (powerSyncInstance) {
    await powerSyncInstance.disconnectAndClear();
    powerSyncInstance = null;
  }
}
