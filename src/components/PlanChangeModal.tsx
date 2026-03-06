import { useState, useEffect } from 'react';
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react';
import { useTranslation } from '../hooks/useTranslation';
import { supabase } from '../lib/supabase';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ProrationLine {
  description: string;
  amount: number;
}

interface ProrationPreview {
  prorationAmount: number; // cents (positive = charge, negative = credit)
  currency: string;
  lines: ProrationLine[];
}

interface PlanChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  targetTier: 'starter' | 'pro';
  currentTier: 'starter' | 'pro';
  isProcessing: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(cents: number, currency: string): string {
  return (cents / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: currency || 'usd',
  });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PlanChangeModal({
  isOpen,
  onClose,
  onConfirm,
  targetTier,
  currentTier,
  isProcessing,
}: PlanChangeModalProps) {
  const { t } = useTranslation();
  const [preview, setPreview] = useState<ProrationPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const isUpgrade = targetTier === 'pro';
  const currentPlanLabel = currentTier === 'pro' ? 'Pro' : 'Starter';
  const targetPlanLabel = targetTier === 'pro' ? 'Pro' : 'Starter';

  // Fetch proration preview when modal opens
  useEffect(() => {
    if (!isOpen) {
      setPreview(null);
      setPreviewError(null);
      return;
    }

    let ignore = false;

    async function fetchPreview() {
      setPreviewLoading(true);
      setPreviewError(null);

      try {
        const { data, error } = await supabase.functions.invoke(
          'update-subscription',
          { body: { target_tier: targetTier, preview: true } }
        );

        if (ignore) return;

        if (error) {
          setPreviewError(error.message || 'Failed to load preview');
          return;
        }

        if (data?.error) {
          setPreviewError(data.error);
          return;
        }

        setPreview({
          prorationAmount: data.proration_amount ?? 0,
          currency: data.currency ?? 'usd',
          lines: (data.lines ?? []).map((line: { description: string; amount: number }) => ({
            description: line.description,
            amount: line.amount,
          })),
        });
      } catch (err) {
        if (ignore) return;
        setPreviewError(err instanceof Error ? err.message : 'Unexpected error');
      } finally {
        if (!ignore) setPreviewLoading(false);
      }
    }

    fetchPreview();

    return () => { ignore = true; };
  }, [isOpen, targetTier]);

  const title = isUpgrade
    ? t('subscription.upgradeConfirmTitle')
    : t('subscription.downgradeConfirmTitle');

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-black/50 transition-opacity duration-300 ease-out data-[closed]:opacity-0"
      />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel
          transition
          className="w-full max-w-sm bg-surface-modal rounded-2xl p-6 shadow-xl transition duration-300 ease-out data-[closed]:scale-95 data-[closed]:opacity-0"
        >
          <DialogTitle className="text-lg font-semibold text-white mb-4">
            {title}
          </DialogTitle>

          {/* Plan change summary */}
          <div className="flex items-center gap-2 text-sm text-white/60 mb-4">
            <span>{currentPlanLabel}</span>
            <span className="text-white/40">&rarr;</span>
            <span className="text-white font-medium">{targetPlanLabel}</span>
          </div>

          {/* Preview content */}
          <div className="mb-6">
            {previewLoading && (
              <div className="space-y-2 animate-pulse">
                <div className="h-4 bg-white/10 rounded w-3/4" />
                <div className="h-4 bg-white/10 rounded w-1/2" />
              </div>
            )}

            {previewError && (
              <p className="text-red-300 text-sm">{previewError}</p>
            )}

            {!previewLoading && !previewError && isUpgrade && preview && (
              <div>
                <p className="text-white/70 text-sm mb-3">
                  {t('subscription.upgradeProration', {
                    amount: formatCurrency(preview.prorationAmount, preview.currency),
                  })}
                </p>
                {preview.lines.length > 0 && (
                  <div className="space-y-1 border-t border-white/10 pt-2">
                    {preview.lines.map((line, i) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span className="text-white/60 flex-1 mr-2">{line.description}</span>
                        <span className="text-white/80 whitespace-nowrap">
                          {formatCurrency(line.amount, preview.currency)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {!previewLoading && !previewError && !isUpgrade && (
              <p className="text-white/70 text-sm">
                {t('subscription.downgradeInfo')}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 w-full">
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="flex-1 py-2.5 rounded-lg font-medium text-white/70 bg-surface-modal-lighter hover:bg-surface-header transition-colors disabled:opacity-50"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={onConfirm}
              disabled={isProcessing || previewLoading}
              className={`flex-1 py-2.5 rounded-lg font-medium text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2 ${
                isUpgrade
                  ? 'bg-btn-confirm text-btn-confirm-text hover:bg-btn-confirm/80'
                  : 'bg-red-800 hover:bg-red-900'
              }`}
            >
              {isProcessing ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  {t('subscription.processing')}
                </>
              ) : (
                t('subscription.confirm')
              )}
            </button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
