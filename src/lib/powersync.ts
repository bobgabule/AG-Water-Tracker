import { PowerSyncDatabase } from '@powersync/web';
import { AppSchema } from './powersync-schema.ts';
import { SupabaseConnector } from './powersync-connector.ts';

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
