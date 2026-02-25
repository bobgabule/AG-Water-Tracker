import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react';
import { MapPinIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface LocationSoftAskModalProps {
  open: boolean;
  onClose: () => void;
  onAllow: () => void;
  mode: 'prompt' | 'denied';
}

export default function LocationSoftAskModal({
  open,
  onClose,
  onAllow,
  mode,
}: LocationSoftAskModalProps) {
  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-black/50 transition-opacity duration-300 ease-out data-[closed]:opacity-0"
      />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel
          transition
          className="w-full max-w-sm bg-surface-modal rounded-2xl p-6 shadow-xl transition duration-300 ease-out data-[closed]:scale-95 data-[closed]:opacity-0"
        >
          <div className="flex flex-col items-center text-center">
            {mode === 'prompt' ? (
              <div className="w-12 h-12 rounded-full bg-btn-confirm/30 flex items-center justify-center mb-4">
                <MapPinIcon className="h-6 w-6 text-btn-confirm" />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center mb-4">
                <ExclamationTriangleIcon className="h-6 w-6 text-amber-400" />
              </div>
            )}

            <DialogTitle className="text-lg font-semibold text-white mb-2">
              {mode === 'prompt' ? 'Use your location?' : 'Location access blocked'}
            </DialogTitle>

            <p className="text-white/60 text-sm mb-6">
              {mode === 'prompt'
                ? 'Your location helps center the map and find nearby wells. We only use it while the app is open.'
                : 'Location permission was denied. To enable it, open your browser settings and allow location access for this site.'}
            </p>

            <div className="flex gap-3 w-full">
              {mode === 'prompt' ? (
                <>
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 py-2.5 rounded-lg font-medium text-white/70 bg-surface-modal-lighter hover:bg-surface-header transition-colors"
                  >
                    No Thanks
                  </button>
                  <button
                    type="button"
                    onClick={onAllow}
                    autoFocus
                    className="flex-1 py-2.5 rounded-lg font-medium bg-btn-confirm text-btn-confirm-text hover:opacity-90 transition-colors"
                  >
                    Allow
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={onClose}
                  autoFocus
                  className="flex-1 py-2.5 rounded-lg font-medium text-white/70 bg-surface-modal-lighter hover:bg-surface-header transition-colors"
                >
                  Got It
                </button>
              )}
            </div>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
