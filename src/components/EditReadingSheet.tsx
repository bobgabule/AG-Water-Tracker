import { useState, useCallback } from 'react';
import { Dialog, DialogBackdrop, DialogPanel } from '@headlessui/react';
import { usePowerSync } from '@powersync/react';
import { useTranslation } from '../hooks/useTranslation';
import { useToastStore } from '../stores/toastStore';
import ConfirmDialog from './ConfirmDialog';
import type { ReadingWithName } from '../hooks/useWellReadingsWithNames';

interface EditReadingSheetProps {
  open: boolean;
  onClose: () => void;
  reading: ReadingWithName;
  wellUnits: string;
  wellMultiplier: string;
}

export default function EditReadingSheet({
  open,
  onClose,
  reading,
  wellUnits,
  wellMultiplier,
}: EditReadingSheetProps) {
  const { t, locale } = useTranslation();
  const db = usePowerSync();

  const [editValue, setEditValue] = useState(reading.value);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const readingDate = new Date(reading.recordedAt).toLocaleDateString(locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const readingTime = new Date(reading.recordedAt).toLocaleTimeString(locale, {
    hour: 'numeric',
    minute: '2-digit',
  });

  const handleValueChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setEditValue(e.target.value);
      if (validationError) setValidationError(null);
    },
    [validationError],
  );

  const handleSave = useCallback(async () => {
    const trimmed = editValue.trim();
    if (!trimmed || isNaN(Number(trimmed)) || Number(trimmed) <= 0) {
      setValidationError(t('reading.validationEdit'));
      return;
    }
    setValidationError(null);
    setSaving(true);
    try {
      await db.execute(
        'UPDATE readings SET value = ?, updated_at = ? WHERE id = ?',
        [trimmed, new Date().toISOString(), reading.id],
      );
      useToastStore.getState().show(t('reading.updated'));
      onClose();
    } catch {
      useToastStore.getState().show(t('reading.updateFailed'), 'error');
    } finally {
      setSaving(false);
    }
  }, [db, editValue, reading.id, onClose]);

  const handleDelete = useCallback(async () => {
    setDeleting(true);
    try {
      await db.execute('DELETE FROM readings WHERE id = ?', [reading.id]);
      useToastStore.getState().show(t('reading.deleted'));
      setShowDeleteConfirm(false);
      onClose();
    } catch {
      useToastStore.getState().show(t('reading.deleteFailed'), 'error');
    } finally {
      setDeleting(false);
    }
  }, [db, reading.id, onClose]);

  const handleOpenDelete = useCallback(() => {
    setShowDeleteConfirm(true);
  }, []);

  const handleCloseDelete = useCallback(() => {
    setShowDeleteConfirm(false);
  }, []);

  return (
    <>
      <Dialog open={open} onClose={onClose} className="relative z-[60]">
        <DialogBackdrop
          transition
          className="fixed inset-0 bg-black/40 transition-opacity duration-300 ease-out data-[closed]:opacity-0"
        />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <DialogPanel
            transition
            className="w-full max-w-sm bg-surface-header rounded-2xl p-5 shadow-xl transition duration-300 ease-out data-[closed]:scale-95 data-[closed]:opacity-0"
          >
            {/* Header */}
            <div className="mb-4">
              <h2 className="text-white font-bold text-lg">{t('reading.editReading')}</h2>
              <p className="text-white/60 text-sm">
                {readingDate} at {readingTime}
              </p>
            </div>

            {/* Input section */}
            <div className="space-y-3 mb-6">
              <label className="text-white/80 text-sm font-medium">
                {t('reading.meterValue')}
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  inputMode="decimal"
                  pattern="[0-9]*\.?[0-9]*"
                  value={editValue}
                  onChange={handleValueChange}
                  className="flex-1 text-2xl font-bold text-white bg-white/10 rounded-xl px-4 py-3 placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/30"
                />
                <span className="text-sm text-white/70 whitespace-nowrap">
                  {wellUnits} x {wellMultiplier}
                </span>
              </div>
              {validationError && (
                <p className="text-red-400 text-sm">{validationError}</p>
              )}
            </div>

            {/* Footer buttons */}
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={handleOpenDelete}
                disabled={saving}
                className="text-red-400 text-sm font-medium disabled:opacity-50"
              >
                {t('common.delete')}
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={saving}
                  className="px-4 py-2 rounded-lg text-white font-medium bg-white/20 disabled:opacity-50"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-2 rounded-lg font-medium bg-btn-confirm text-btn-confirm-text disabled:opacity-50 flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-btn-confirm-text border-t-transparent rounded-full animate-spin" />
                      {t('reading.saving')}
                    </>
                  ) : (
                    t('reading.save')
                  )}
                </button>
              </div>
            </div>
          </DialogPanel>
        </div>
      </Dialog>

      <ConfirmDialog
        open={showDeleteConfirm}
        onClose={handleCloseDelete}
        onConfirm={handleDelete}
        title={t('confirm.delete')}
        description={<>Delete the reading <span className="text-white font-medium">{reading.value}</span> from <span className="text-white font-medium">{readingDate}</span>? This cannot be undone.</>}
        confirmText={t('confirm.delete')}
        confirmLoadingText={t('confirm.deleting')}
        loading={deleting}
      />
    </>
  );
}
