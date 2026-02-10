import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { PowerSyncDatabase } from '@powersync/web';
import { PowerSyncContext as PSContext } from '@powersync/react';
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
          <p className="text-gray-400 text-sm">Taking longer than usual...</p>
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

  useEffect(() => {
    let cancelled = false;

    setupPowerSync()
      .then((database) => {
        if (!cancelled) {
          setState({ db: database, loading: false, error: null });
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setState({
            db: null,
            loading: false,
            error: err instanceof Error ? err : new Error(String(err)),
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (state.loading) {
    return <PowerSyncLoadingScreen />;
  }

  if (state.error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center text-status-danger">
          <p className="font-bold">Database initialization failed</p>
          <p className="text-sm mt-2">{state.error.message}</p>
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
