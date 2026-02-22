import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react';
import { XMarkIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';

interface WellLimitModalProps {
  open: boolean;
  onClose: () => void;
  upgradeUrl: string | null;
  isGrower: boolean;
}

export default function WellLimitModal({
  open,
  onClose,
  upgradeUrl,
  isGrower,
}: WellLimitModalProps) {
  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-black/50 transition-opacity duration-300 ease-out data-[closed]:opacity-0"
      />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel
          transition
          className="w-full max-w-sm bg-gray-800 rounded-2xl p-6 shadow-xl transition duration-300 ease-out data-[closed]:scale-95 data-[closed]:opacity-0"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1 rounded-full text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
            aria-label="Close"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>

          <DialogTitle className="text-lg font-semibold text-white mb-2">
            Well Limit Reached
          </DialogTitle>

          <p className="text-gray-400 text-sm mb-6">
            You've reached your well limit. Upgrade your plan for more wells.
          </p>

          {isGrower && (
            <a
              href={upgradeUrl ?? '#'}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-white bg-[#5f7248] hover:bg-[#4e6139] transition-colors ${
                upgradeUrl === null ? 'opacity-50 pointer-events-none' : ''
              }`}
              aria-disabled={upgradeUrl === null}
            >
              <ArrowTopRightOnSquareIcon className="w-5 h-5" />
              Upgrade Plan
            </a>
          )}
        </DialogPanel>
      </div>
    </Dialog>
  );
}
