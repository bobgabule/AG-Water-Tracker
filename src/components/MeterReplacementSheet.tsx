import { useState, useCallback } from 'react';
import { Dialog, DialogBackdrop, DialogPanel } from '@headlessui/react';
import { CheckIcon } from '@heroicons/react/24/outline';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { useTranslation } from '../hooks/useTranslation';
import { supabase } from '../lib/supabase';
import { useToastStore } from '../stores/toastStore';
import type { WellWithReading } from '../hooks/useWells';

interface MeterReplacementSheetProps {
  well: WellWithReading;
  farmId: string;
  userId: string;
  onClose: () => void;
  onComplete: () => void;
}

export default function MeterReplacementSheet({
  well,
  farmId,
  userId,
  onClose,
  onComplete,
}: MeterReplacementSheetProps) {
  const { t } = useTranslation();
  const isOnline = useOnlineStatus();

  const [newSerialNumber, setNewSerialNumber] = useState('');
  const [newStartingReading, setNewStartingReading] = useState('');
  const [serialError, setSerialError] = useState<string | null>(null);
  const [readingError, setReadingError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const resetForm = useCallback(() => {
    setNewSerialNumber('');
    setNewStartingReading('');
    setSerialError(null);
    setReadingError(null);
    setSaving(false);
  }, []);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [resetForm, onClose]);

  const handleSerialChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setNewSerialNumber(e.target.value);
      if (serialError) setSerialError(null);
    },
    [serialError],
  );

  const handleReadingChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setNewStartingReading(e.target.value);
      if (readingError) setReadingError(null);
    },
    [readingError],
  );

  const handleSave = useCallback(async () => {
    // Validate fields
    setSerialError(null);
    setReadingError(null);

    const trimmedSerial = newSerialNumber.trim();
    const trimmedReading = newStartingReading.trim();

    if (!trimmedSerial) {
      setSerialError(t('meter.serialRequired'));
      return;
    }
    if (!trimmedReading) {
      setReadingError(t('meter.readingRequired'));
      return;
    }

    const readingNum = parseFloat(trimmedReading);
    if (isNaN(readingNum) || readingNum <= 0) {
      setReadingError(t('meter.readingMustBePositive'));
      return;
    }

    // Require internet
    if (!isOnline) {
      useToastStore.getState().show(t('common.requiresInternet'), 'error');
      return;
    }

    setSaving(true);
    try {
      // 1. Update well's serial number via Supabase
      const { error: wellError } = await supabase
        .from('wells')
        .update({
          meter_serial_number: trimmedSerial,
          updated_at: new Date().toISOString(),
        })
        .eq('id', well.id);

      if (wellError) throw wellError;

      // 2. Insert meter replacement reading via Supabase
      const { error: readingError } = await supabase
        .from('readings')
        .insert({
          well_id: well.id,
          farm_id: farmId,
          value: readingNum,
          type: 'meter_replacement',
          recorded_by: userId,
          recorded_at: new Date().toISOString(),
          is_in_range: true,
          is_similar_reading: 0,
          notes: `Old S/N: ${well.meterSerialNumber || 'N/A'}`,
        });

      if (readingError) throw readingError;

      // 3. Show success toast
      useToastStore.getState().show(t('meter.replacementRecorded'));
      resetForm();
      onComplete();
    } catch {
      useToastStore.getState().show(t('reading.saveFailed'), 'error');
    } finally {
      setSaving(false);
    }
  }, [
    newSerialNumber,
    newStartingReading,
    isOnline,
    well.id,
    well.meterSerialNumber,
    farmId,
    userId,
    resetForm,
    onComplete,
    t,
  ]);

  return (
    <Dialog open onClose={handleClose} className="relative z-[60]">
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-black/40 transition-opacity duration-300 ease-out data-[closed]:opacity-0"
      />
      <div className="fixed inset-0 flex items-end">
        <DialogPanel
          transition
          className="w-full bg-surface-header shadow-xl transition duration-300 ease-out data-[closed]:translate-y-full max-h-[90vh] flex flex-col rounded-t-2xl"
        >
          {/* Header */}
          <div className="p-4 pt-6 flex-shrink-0">
            <p className="text-white/70 text-xs">{well.name}</p>
            <h2 className="text-white font-bold text-lg tracking-wide">
              {t('meter.replaceMeter').toUpperCase()}
            </h2>
          </div>

          {/* Form content */}
          <div className="flex-1 overflow-y-auto px-4 pb-4">
            <div className="space-y-4">
              {/* Current serial number (read-only) */}
              <div>
                <label className="text-xs text-white/70 mb-1 block">
                  {t('meter.currentSerial')}
                </label>
                <div className="w-full px-3 py-2.5 bg-white/5 border border-white/20 rounded-lg text-base text-white/60">
                  {well.meterSerialNumber || 'N/A'}
                </div>
              </div>

              {/* New serial number */}
              <div>
                <label className="text-xs text-white mb-1 block">
                  {t('meter.newSerialNumber')}*
                </label>
                <input
                  type="text"
                  value={newSerialNumber}
                  onChange={handleSerialChange}
                  placeholder={t('well.serialPlaceholder')}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-base placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
                />
                {serialError && (
                  <p className="text-red-800 text-xs mt-1">{serialError}</p>
                )}
              </div>

              {/* New starting reading */}
              <div>
                <label className="text-xs text-white mb-1 block">
                  {t('meter.newStartingReading')}*
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={newStartingReading}
                  onChange={handleReadingChange}
                  placeholder="0"
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-base placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
                />
                {readingError && (
                  <p className="text-red-800 text-xs mt-1">{readingError}</p>
                )}
              </div>

              {/* Helper text */}
              <p className="text-white/50 text-xs leading-relaxed">
                {t('meter.replaceHelp')}
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-between items-center px-4 py-4 flex-shrink-0 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <button
              type="button"
              onClick={handleClose}
              className="text-white font-medium"
            >
              {t('common.cancel')}
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2.5 bg-btn-confirm text-btn-confirm-text rounded-lg font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <div className="w-5 h-5 border-2 border-btn-confirm-text border-t-transparent rounded-full animate-spin" />
              ) : (
                <CheckIcon className="w-5 h-5" />
              )}
              {t('meter.saveReplacement')}
            </button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
