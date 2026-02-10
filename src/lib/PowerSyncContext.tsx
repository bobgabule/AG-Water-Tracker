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

function PowerSyncLoadingScreen() {
  const [showSlowMessage, setShowSlowMessage] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowSlowMessage(true), 5000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900">
      <div className="text-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
        {showSlowMessage && (
          <p className="text-gray-400 text-sm">Connecting to database...</p>
        )}
      </div>
    </div>
  );
}

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
    setState({ db: null, loading: true, error: null });

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

  if (state.loading) {
    return <PowerSyncLoadingScreen />;
  }

  if (state.error) {
    const handleRetry = () => {
      setIsRetrying(true);
      setRetryCount(c => c + 1);
    };

    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-center">
          <ArrowPathIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-white font-medium mb-2">Something went wrong</p>
          <p className="text-gray-400 text-sm mb-6">
            We couldn't initialize the database
          </p>
          <button
            onClick={handleRetry}
            disabled={isRetrying}
            className="px-6 py-2 bg-green-500 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-medium text-white transition-colors"
          >
            {isRetrying ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                Retrying...
              </span>
            ) : (
              'Tap to try again'
            )}
          </button>
        </div>
      </div>
    );
  }

  if (!state.db) {
    return null;
  }

  return (
    <PSContext.Provider value={state.db}>
      <InternalContext.Provider value={state}>{children}</InternalContext.Provider>
    </PSContext.Provider>
  );
}

export function useDatabase(): PowerSyncDatabase {
  const { db } = useContext(InternalContext);
  if (!db) {
    throw new Error('useDatabase must be used within PowerSyncProvider');
  }
  return db;
}
