import { Component, type ReactNode } from 'react';
import { useLanguageStore } from '../stores/languageStore';
import { translations } from '../i18n/index';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  isRetrying: boolean;
}

const RELOAD_COUNT_KEY = 'chunk-reload-count';

/** Imperative translation lookup for class components (no hooks available). */
function getTranslation(key: string): string {
  const locale = useLanguageStore.getState().locale;
  return translations[locale][key] ?? translations['en'][key] ?? key;
}

function isChunkLoadError(error: Error): boolean {
  return (
    error.name === 'ChunkLoadError' ||
    error.message?.includes('Failed to fetch dynamically imported module') ||
    error.message?.includes('Loading chunk') ||
    error.message?.includes('Importing a module script failed')
  );
}

export default class LazyErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null, isRetrying: false };
  private hasRetried = false;

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, isRetrying: false };
  }

  componentDidCatch(error: Error): void {
    if (isChunkLoadError(error) && !this.hasRetried) {
      // First chunk error: attempt a silent retry by re-rendering
      this.hasRetried = true;
      this.setState({ hasError: false, error: null, isRetrying: true });
      return;
    }

    if (isChunkLoadError(error) && this.hasRetried) {
      // Retry already failed -- check auto-reload budget
      const reloadCount = parseInt(
        sessionStorage.getItem(RELOAD_COUNT_KEY) ?? '0',
        10
      );
      if (reloadCount < 1) {
        sessionStorage.setItem(RELOAD_COUNT_KEY, String(reloadCount + 1));
        // Show brief message then auto-reload
        this.setState({ hasError: true, error, isRetrying: false });
        setTimeout(() => window.location.reload(), 1000);
      }
      // If >= 1 reloads already used, fall through to show manual error card
    }
  }

  componentDidMount(): void {
    // Successful mount = clear reload counter
    sessionStorage.removeItem(RELOAD_COUNT_KEY);
  }

  render() {
    const { hasError, error, isRetrying } = this.state;

    // During silent retry, re-render children so the lazy import is re-attempted
    if (isRetrying && !hasError) {
      return this.props.children;
    }

    if (!hasError) {
      return this.props.children;
    }

    // Determine which error card to show
    const isChunk = error ? isChunkLoadError(error) : false;
    const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;

    // ChunkLoadError with auto-reload budget remaining: show transition message
    if (isChunk && !isOffline) {
      const reloadCount = parseInt(
        sessionStorage.getItem(RELOAD_COUNT_KEY) ?? '0',
        10
      );
      if (reloadCount <= 1) {
        return (
          <div className="min-h-screen bg-gray-900 flex items-center justify-center">
            <div className="bg-gray-800 rounded-xl p-6 text-center max-w-sm mx-4">
              <p className="text-white text-lg font-medium">
                {getTranslation('error.appUpdatedReloading')}
              </p>
            </div>
          </div>
        );
      }
    }

    // Offline state
    if (isOffline) {
      return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center">
          <div className="bg-gray-800 rounded-xl p-6 text-center max-w-sm mx-4">
            <p className="text-white text-lg font-medium mb-4">
              {getTranslation('error.offlineCheck')}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
            >
              {getTranslation('error.reload')}
            </button>
          </div>
        </div>
      );
    }

    // Default error state (chunk error after max reloads, or generic error)
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="bg-gray-800 rounded-xl p-6 text-center max-w-sm mx-4">
          <p className="text-white text-lg font-medium mb-4">
            {getTranslation('error.pageLoadFailed')}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
          >
            {getTranslation('error.reload')}
          </button>
        </div>
      </div>
    );
  }
}
