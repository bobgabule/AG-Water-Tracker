import type { AbstractPowerSyncDatabase, PowerSyncBackendConnector } from '@powersync/web';
import { UpdateType } from '@powersync/web';
import type { CrudEntry } from '@powersync/web';
import { isAuthRetryableFetchError } from '@supabase/supabase-js';
import { supabase } from './supabase.ts';
import { debugError, debugWarn } from './debugLog';

/** Tables the connector is allowed to write to Supabase */
const ALLOWED_TABLES = new Set(['farms', 'users', 'farm_members', 'farm_invites', 'wells']);

/**
 * Returns true if the error is permanent (non-retryable).
 * Permanent errors should complete the transaction to avoid infinite retry loops.
 */
function isPermanentError(error: unknown): boolean {
  // Network errors are retryable
  if (error instanceof TypeError) return false;

  if (typeof error === 'object' && error !== null) {
    const err = error as { code?: string };

    // PostgreSQL constraint violations (23xxx) are permanent
    if (err.code?.startsWith('23')) return true;

    // RLS / permission violations are permanent
    if (err.code === '42501') return true;

    // PostgREST errors are permanent (bad request, not found, etc.)
    if (err.code?.startsWith('PGRST')) return true;
  }

  return false;
}

export class SupabaseConnector implements PowerSyncBackendConnector {
  async fetchCredentials() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session) {
      return {
        endpoint: import.meta.env.VITE_POWERSYNC_URL,
        token: session.access_token,
      };
    }

    // No session in memory -- try refreshing the token
    const { data: { session: refreshed }, error } = await supabase.auth.refreshSession();

    if (error) {
      if (isAuthRetryableFetchError(error)) {
        // Network/5xx error -- throw so PowerSync retries later
        throw error;
      }
      // Permanent auth failure (revoked token, invalid refresh token)
      // Return null to signal "not authenticated" -- PowerSync will stop connecting
      debugWarn('PowerSync', 'Permanent auth error in fetchCredentials:', error.message);
      return null;
    }

    if (!refreshed) {
      // No error but no session -- treat as not authenticated
      return null;
    }

    return {
      endpoint: import.meta.env.VITE_POWERSYNC_URL,
      token: refreshed.access_token,
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
      if (isPermanentError(error)) {
        debugError('PowerSync', 'Permanent upload error, discarding transaction:', error);
        await transaction.complete();
      } else {
        debugWarn('PowerSync', 'Retryable upload error:', error);
        throw error;
      }
    }
  }

  /**
   * Normalizes data types before sending to Supabase.
   * Converts PowerSync integer booleans (0/1) to actual booleans.
   */
  private normalizeForSupabase(
    table: string,
    data: Record<string, unknown>,
  ): Record<string, unknown> {
    if (table === 'wells' && 'send_monthly_report' in data) {
      return { ...data, send_monthly_report: Boolean(data.send_monthly_report) };
    }
    return data;
  }

  private async applyOperation(op: CrudEntry): Promise<void> {
    const table = op.table;

    if (!ALLOWED_TABLES.has(table)) {
      debugError('PowerSync', 'Unexpected table in CRUD operation:', table);
      return;
    }

    switch (op.op) {
      case UpdateType.PUT: {
        let data: Record<string, unknown> = { ...op.opData, id: op.id };
        data = this.normalizeForSupabase(table, data);

        const { error } = await supabase.from(table).upsert(data).select();
        if (error) throw error;
        break;
      }
      case UpdateType.PATCH: {
        if (!op.opData) return;
        const data = this.normalizeForSupabase(table, op.opData);
        const { error } = await supabase
          .from(table)
          .update(data)
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
