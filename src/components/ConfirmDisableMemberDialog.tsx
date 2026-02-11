import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react';
import { NoSymbolIcon } from '@heroicons/react/24/outline';

interface ConfirmDisableMemberDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  memberName: string;
  loading: boolean;
}

export default function ConfirmDisableMemberDialog({
  open,
  onClose,
  onConfirm,
  memberName,
  loading,
}: ConfirmDisableMemberDialogProps) {
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
          <div className="flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-full bg-orange-500/20 flex items-center justify-center mb-4">
              <NoSymbolIcon className="h-6 w-6 text-orange-400" />
            </div>

            <DialogTitle className="text-lg font-semibold text-white mb-2">
              Disable User
            </DialogTitle>

            <p className="text-gray-400 text-sm mb-6">
              Disable <span className="text-white font-medium">{memberName}</span> from
              your farm? They will not be able to log in, but their data will be preserved.
              You can re-enable them later.
            </p>

            <div className="flex gap-3 w-full">
              <button
                onClick={onClose}
                disabled={loading}
                className="flex-1 py-2.5 rounded-lg font-medium text-gray-300 bg-gray-700 hover:bg-gray-600 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                disabled={loading}
                className="flex-1 py-2.5 rounded-lg font-medium text-white bg-orange-600 hover:bg-orange-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Disabling...
                  </>
                ) : (
                  'Disable'
                )}
              </button>
            </div>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
