import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { PlusCircleIcon } from '@heroicons/react/24/solid';
import { useCallback } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from '../hooks/useTranslation';

interface WellLimitModalProps {
  open: boolean;
  onClose: () => void;
  canManageAddons: boolean;
}

export default function WellLimitModal({
  open,
  onClose,
  canManageAddons,
}: WellLimitModalProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleAddWells = useCallback(() => {
    onClose();
    navigate('/subscription');
  }, [onClose, navigate]);

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
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1 rounded-full text-white/60 hover:text-white hover:bg-surface-modal-lighter transition-colors"
            aria-label={t('common.close')}
          >
            <XMarkIcon className="w-5 h-5" />
          </button>

          <DialogTitle className="text-lg font-semibold text-white mb-2">
            {t('limit.wellLimitReached')}
          </DialogTitle>

          <p className="text-white/60 text-sm mb-6">
            {t('limit.wellLimitDescription')}
          </p>

          {canManageAddons && (
            <button
              onClick={handleAddWells}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              <PlusCircleIcon className="w-5 h-5" />
              {t('limit.addMoreWells')}
            </button>
          )}
        </DialogPanel>
      </div>
    </Dialog>
  );
}
