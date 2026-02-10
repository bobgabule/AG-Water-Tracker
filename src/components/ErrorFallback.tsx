import React from 'react';
import type { FallbackProps } from 'react-error-boundary';
import { ExclamationTriangleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

/**
 * Full-page error fallback for route-level ErrorBoundary.
 * Shows a friendly "Something went wrong" message with a retry button.
 * No technical error details are exposed to the user.
 */
export const ErrorFallback = React.memo(function ErrorFallback({
  resetErrorBoundary,
}: FallbackProps) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center min-h-[50vh] p-6"
    >
      <ExclamationTriangleIcon className="w-12 h-12 text-gray-400 mb-4" />
      <h2 className="text-lg font-medium text-white mb-2">
        Something went wrong
      </h2>
      <p className="text-gray-400 text-sm mb-6">Tap to try again.</p>
      <button
        onClick={resetErrorBoundary}
        className="flex items-center gap-2 px-5 py-3 bg-primary rounded-lg text-white font-medium"
      >
        <ArrowPathIcon className="w-5 h-5" />
        Try Again
      </button>
    </div>
  );
});

/**
 * Compact error fallback for MapView-specific ErrorBoundary.
 * Same friendly message but sized to fit within the map area
 * with a semi-transparent background for visual containment.
 */
export const MapErrorFallback = React.memo(function MapErrorFallback({
  resetErrorBoundary,
}: FallbackProps) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center min-h-[30vh] p-6 bg-gray-900/80 rounded-xl"
    >
      <ExclamationTriangleIcon className="w-12 h-12 text-gray-400 mb-4" />
      <h2 className="text-lg font-medium text-white mb-2">
        Something went wrong
      </h2>
      <p className="text-gray-400 text-sm mb-6">Tap to try again.</p>
      <button
        onClick={resetErrorBoundary}
        className="flex items-center gap-2 px-5 py-3 bg-primary rounded-lg text-white font-medium"
      >
        <ArrowPathIcon className="w-5 h-5" />
        Try Again
      </button>
    </div>
  );
});
