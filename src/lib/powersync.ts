import { PowerSyncDatabase } from '@powersync/web';
import { AppSchema } from './powersync-schema.ts';
import { SupabaseConnector } from './powersync-connector.ts';
import { debugLog } from './debugLog';

let powerSyncInstance: PowerSyncDatabase | null = null;

export async function setupPowerSync(): Promise<PowerSyncDatabase> {
  if (powerSyncInstance) {
    return powerSyncInstance;
  }

  const connector = new SupabaseConnector();

  const db = new PowerSyncDatabase({
    schema: AppSchema,
    database: {
      dbFilename: 'ag-water-tracker.db',
    },
  });

  await db.init();
  await db.connect(connector);

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
}

export function getPowerSyncInstance(): PowerSyncDatabase | null {
  return powerSyncInstance;
}

export async function disconnectAndClear(): Promise<void> {
  if (powerSyncInstance) {
    await powerSyncInstance.disconnectAndClear();
    powerSyncInstance = null;
  }
}
