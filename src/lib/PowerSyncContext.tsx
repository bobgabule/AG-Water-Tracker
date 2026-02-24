import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { PowerSyncDatabase } from '@powersync/web';
import { PowerSyncContext as PSContext } from '@powersync/react';
import { ArrowPathIcon } from '@heroicons/react/24/outline';
import { setupPowerSync } from './powersync.ts';

interface PowerSyncState {
  db: PowerSyncDatabase | null;
  loading: boolean;
  error: Error | null;
}

const InternalContext = createContext<PowerSyncState>({
  db: null,
  loading: true,
  error: null,
});

/**
 * Non-blocking error banner shown when PowerSync initialization fails.
 * Rendered alongside children so the app shell remains visible.
 */
function PowerSyncErrorBanner({
  onRetry,
  isRetrying,
}: {
  onRetry: () => void;
  isRetrying: boolean;
}) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 p-4 bg-red-900/95 text-white flex items-center justify-between gap-3 shadow-lg">
      <div className="flex items-center gap-3 min-w-0">
        <ArrowPathIcon className="h-5 w-5 shrink-0" />
        <p className="text-sm truncate">
          Database connection failed. Some features may be unavailable.
        </p>
      </div>
      <button
        onClick={onRetry}
        disabled={isRetrying}
        className="shrink-0 px-4 py-1.5 bg-white/20 hover:bg-white/30 disabled:opacity-50 disabled:cursor-not-allowed rounded text-sm font-medium transition-colors"
      >
        {isRetrying ? 'Retrying...' : 'Retry'}
      </button>
    </div>
  );
}

/**
 * Non-blocking PowerSync provider.
 *
 * Renders children immediately while PowerSync initializes in the background.
 * The app shell (Header, SideMenu) is visible from the start. Pages that
 * depend on PowerSync data show skeleton placeholders until the database is
 * ready and data syncs.
 *
 * If initialization fails, a non-blocking error banner is shown at the
 * bottom of the screen with a retry button.
 */
export function PowerSyncProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PowerSyncState>({
    db: null,
    loading: true,
    error: null,
  });
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    let cancelled = false;

    // Reset to loading state when retrying
    setState((prev) => ({ ...prev, loading: true, error: null }));

    setupPowerSync()
      .then((database) => {
        if (!cancelled) {
          setState({ db: database, loading: false, error: null });
          setIsRetrying(false);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setState({
            db: null,
            loading: false,
            error: err instanceof Error ? err : new Error(String(err)),
          });
          setIsRetrying(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [retryCount]);

  const handleRetry = () => {
    setIsRetrying(true);
    setRetryCount((c) => c + 1);
  };

  // Always render children — never block on loading or error
  const content = (
    <InternalContext.Provider value={state}>
      {children}
      {state.error && !state.db && (
        <PowerSyncErrorBanner onRetry={handleRetry} isRetrying={isRetrying} />
      )}
    </InternalContext.Provider>
  );

  // When db is available, wrap with PSContext so PowerSync hooks work
  if (state.db) {
    return (
      <PSContext.Provider value={state.db}>
        {content}
      </PSContext.Provider>
    );
  }

  return content;
}

/**
 * Returns the PowerSync database instance.
 * Throws if called before the database has initialized.
 */
export function useDatabase(): PowerSyncDatabase {
  const { db } = useContext(InternalContext);
  if (!db) {
    throw new Error('useDatabase must be used within PowerSyncProvider after initialization');
  }
  return db;
}

/**
 * Returns the current PowerSync initialization status.
 * Use this in components that need to show skeletons during loading.
 */
export function usePowerSyncStatus(): { loading: boolean; error: Error | null } {
  const { loading, error } = useContext(InternalContext);
  return { loading, error };
}
