import type { AbstractPowerSyncDatabase, PowerSyncBackendConnector } from '@powersync/web';
import { UpdateType } from '@powersync/web';
import type { CrudEntry } from '@powersync/web';
import { supabase } from './supabase.ts';

export class SupabaseConnector implements PowerSyncBackendConnector {
  async fetchCredentials() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      throw new Error('Not authenticated');
    }

    return {
      endpoint: import.meta.env.VITE_POWERSYNC_URL,
      token: session.access_token,
    };
  }

  async uploadData(database: AbstractPowerSyncDatabase): Promise<void> {
    const transaction = await database.getNextCrudTransaction();
    if (!transaction) return;

    try {
      for (const op of transaction.crud) {
        await this.applyOperation(op);
      }
      await transaction.complete();
    } catch (error: unknown) {
      const status = (error as { status?: number })?.status;
      if (status !== undefined && status >= 500) {
        throw error;
      }
      console.error('Upload error (non-retryable):', error);
      await transaction.complete();
    }
  }

  private async applyOperation(op: CrudEntry): Promise<void> {
    const table = op.table;

    switch (op.op) {
      case UpdateType.PUT: {
        const data = { ...op.opData, id: op.id };
        const { error } = await supabase.from(table).upsert(data);
        if (error) throw error;
        break;
      }
      case UpdateType.PATCH: {
        const { error } = await supabase
          .from(table)
          .update(op.opData!)
          .eq('id', op.id);
        if (error) throw error;
        break;
      }
      case UpdateType.DELETE: {
        const { error } = await supabase.from(table).delete().eq('id', op.id);
        if (error) throw error;
        break;
      }
    }
  }
}
