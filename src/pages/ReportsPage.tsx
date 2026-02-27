import { useState, useCallback, useEffect, useRef } from 'react';
import { usePowerSync } from '@powersync/react';
import { XMarkIcon, PlusIcon } from '@heroicons/react/24/outline';
import { useActiveFarm } from '../hooks/useActiveFarm';
import { useReportEmailRecipients } from '../hooks/useReportEmailRecipients';
import { useFarmAdminEmails } from '../hooks/useFarmAdminEmails';
import { supabase } from '../lib/supabase';
import { useTranslation } from '../hooks/useTranslation';

export default function ReportsPage() {
  const { t } = useTranslation();
  const db = usePowerSync();
  const { farmId, farmName: farmNameLabel } = useActiveFarm();
  const { recipients, loading: recipientsLoading } = useReportEmailRecipients();
  const adminEmails = useFarmAdminEmails();

  const [showAddInput, setShowAddInput] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [addError, setAddError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [sendResult, setSendResult] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Auto-dismiss send result after 3 seconds
  useEffect(() => {
    if (!sendResult) return;
    const timer = setTimeout(() => setSendResult(null), 3000);
    return () => clearTimeout(timer);
  }, [sendResult]);

  // Auto-add owner/admin emails on first load (once)
  const hasSyncedRef = useRef(false);
  useEffect(() => {
    if (hasSyncedRef.current || !farmId || recipientsLoading) return;
    if (adminEmails.length === 0) return;

    hasSyncedRef.current = true;

    const existingEmails = new Set(recipients.map((r) => r.email.toLowerCase()));

    const insertions = adminEmails
      .filter((admin) => !existingEmails.has(admin.email.toLowerCase()))
      .map((admin) => {
        const id = crypto.randomUUID();
        const now = new Date().toISOString();
        return db.execute(
          `INSERT INTO report_email_recipients (id, farm_id, email, is_auto_added, source_user_id, created_at, updated_at)
           VALUES (?, ?, ?, 1, ?, ?, ?)`,
          [id, farmId, admin.email.toLowerCase(), admin.userId, now, now],
        );
      });

    Promise.all(insertions).catch((err) =>
      console.error('Failed to auto-add admin emails:', err),
    );
  }, [farmId, adminEmails, recipients, recipientsLoading, db]);

  const handleAddEmail = useCallback(async () => {
    if (!farmId || !newEmail.trim()) return;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail.trim())) {
      setAddError(t('reports.invalidEmail'));
      return;
    }

    if (
      recipients.some(
        (r) => r.email.toLowerCase() === newEmail.trim().toLowerCase(),
      )
    ) {
      setAddError(t('reports.emailExists'));
      return;
    }

    try {
      const id = crypto.randomUUID();
      const now = new Date().toISOString();

      await db.execute(
        `INSERT INTO report_email_recipients (id, farm_id, email, is_auto_added, source_user_id, created_at, updated_at)
         VALUES (?, ?, ?, 0, NULL, ?, ?)`,
        [id, farmId, newEmail.trim().toLowerCase(), now, now],
      );

      setNewEmail('');
      setShowAddInput(false);
      setAddError(null);
    } catch {
      setAddError(t('reports.addEmailFailed'));
    }
  }, [db, farmId, newEmail, recipients]);

  const handleRemoveEmail = useCallback(
    async (recipientId: string) => {
      try {
        await db.execute('DELETE FROM report_email_recipients WHERE id = ?', [
          recipientId,
        ]);
      } catch (err) {
        console.error('Failed to remove email recipient:', err);
      }
    },
    [db],
  );

  const handleSendReport = useCallback(async () => {
    if (!farmId) return;

    setSending(true);
    setSendResult(null);

    try {
      const { data, error } = await supabase.functions.invoke(
        'send-monthly-report',
        { body: { farmId } },
      );

      if (error) throw error;

      setSendResult({
        type: 'success',
        message: data?.message ?? t('reports.sendMonthly'),
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : t('reports.failedSend');
      setSendResult({ type: 'error', message });
    } finally {
      setSending(false);
    }
  }, [farmId]);

  const handleDownloadReport = useCallback(async () => {
    if (!farmId) return;

    setDownloading(true);
    setSendResult(null);

    try {
      const wellRows = await db.getAll<{
        id: string;
        name: string;
        wmis_number: string | null;
        meter_serial_number: string | null;
        units: string;
        multiplier: string;
      }>(
        'SELECT id, name, wmis_number, meter_serial_number, units, multiplier FROM wells WHERE farm_id = ?',
        [farmId],
      );

      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).toISOString();

      const readingRows = await db.getAll<{
        well_id: string;
        value: string;
        recorded_at: string;
        gps_latitude: number | null;
        gps_longitude: number | null;
        notes: string | null;
      }>(
        'SELECT well_id, value, recorded_at, gps_latitude, gps_longitude, notes FROM readings WHERE farm_id = ? AND recorded_at >= ? AND recorded_at <= ? ORDER BY recorded_at ASC',
        [farmId, monthStart, monthEnd],
      );

      const wellMap = new Map(wellRows.map((w) => [w.id, w]));

      function csvField(val: string | number | null | undefined): string {
        const str = String(val ?? '');
        return `"${str.replace(/"/g, '""')}"`;
      }

      const csvRows = [
        'Well Name,WMIS Number,Meter Serial,Units,Multiplier,Reading Value,Recorded At,GPS Latitude,GPS Longitude,Notes',
      ];

      for (const reading of readingRows) {
        const well = wellMap.get(reading.well_id);
        csvRows.push(
          [
            csvField(well?.name),
            csvField(well?.wmis_number),
            csvField(well?.meter_serial_number),
            csvField(well?.units),
            csvField(well?.multiplier),
            csvField(reading.value),
            csvField(reading.recorded_at),
            csvField(reading.gps_latitude),
            csvField(reading.gps_longitude),
            csvField(reading.notes),
          ].join(','),
        );
      }

      const csvContent = '\uFEFF' + csvRows.join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const farmName = farmNameLabel ?? 'Farm';
      const safeName = farmName.replace(/[^a-zA-Z0-9_-]/g, '_');
      const dateSlug = now.toISOString().slice(0, 7);

      const a = document.createElement('a');
      a.href = url;
      a.download = `${safeName}_report_${dateSlug}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 100);

      setSendResult({
        type: 'success',
        message: t('reports.downloadSuccess', { wellCount: String(wellRows.length), readingCount: String(readingRows.length) }),
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : t('reports.failedGenerate');
      setSendResult({ type: 'error', message });
    } finally {
      setDownloading(false);
    }
  }, [farmId, farmNameLabel, db]);

  return (
    <div className="min-h-screen bg-surface-page pt-14">
      <div className="px-4 py-4">
        {/* Title */}
        <h1 className="text-2xl font-bold text-text-heading tracking-wide mb-2">
          {t('reports.title')}
        </h1>

        {/* Subtitle */}
        <p className="text-sm text-text-heading/60 mb-6" dangerouslySetInnerHTML={{ __html: t('reports.subtitle') }} />

        {/* Success/Error feedback */}
        {sendResult && (
          <div
            className={`rounded-lg p-3 mb-4 ${
              sendResult.type === 'success'
                ? 'bg-green-500/10 border border-green-500/30'
                : 'bg-red-800/10 border border-red-800/30'
            }`}
          >
            <p
              className={`text-sm ${
                sendResult.type === 'success'
                  ? 'text-green-600'
                  : 'text-red-800'
              }`}
            >
              {sendResult.message}
            </p>
          </div>
        )}

        {/* Email List section */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-text-heading mb-3">
            {t('reports.emailList')}
          </h2>

          <div className="space-y-2">
            {/* Owner emails first, then admin, then manually added */}
            {adminEmails
              .filter((a) => a.role === 'owner')
              .map((admin) => (
              <div
                key={admin.userId}
                className="flex items-center gap-2 bg-surface-input border border-text-heading/15 rounded-lg px-3 py-2.5"
              >
                <span className="flex-1 text-text-heading text-sm truncate">
                  {admin.email}
                </span>
                <span className="text-xs text-text-heading/40 capitalize flex-shrink-0">
                  {t('reports.roleOwner')}
                </span>
              </div>
            ))}
            {adminEmails
              .filter((a) => a.role === 'admin' || a.role === 'super_admin')
              .map((admin) => (
              <div
                key={admin.userId}
                className="flex items-center gap-2 bg-surface-input border border-text-heading/15 rounded-lg px-3 py-2.5"
              >
                <span className="flex-1 text-text-heading text-sm truncate">
                  {admin.email}
                </span>
                <span className="text-xs text-text-heading/40 capitalize flex-shrink-0">
                  {t('reports.roleAdmin')}
                </span>
              </div>
            ))}
            {/* Manually added emails (removable) */}
            {recipients
              .filter((r) => !adminEmails.some((a) => a.email.toLowerCase() === r.email.toLowerCase()))
              .map((recipient) => (
              <div
                key={recipient.id}
                className="flex items-center gap-2 bg-surface-input border border-text-heading/15 rounded-lg px-3 py-2.5"
              >
                <span className="flex-1 text-text-heading text-sm truncate">
                  {recipient.email}
                </span>
                <button
                  onClick={() => handleRemoveEmail(recipient.id)}
                  className="text-text-heading/40 hover:text-red-800 transition-colors flex-shrink-0"
                  aria-label={`Remove ${recipient.email}`}
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>

          {/* Add email input */}
          {showAddInput ? (
            <div className="mt-3 space-y-2">
              <input
                type="email"
                value={newEmail}
                onChange={(e) => {
                  setNewEmail(e.target.value);
                  setAddError(null);
                }}
                placeholder="email@example.com"
                className="w-full px-3 py-2.5 bg-surface-input border border-text-heading/15 rounded-lg text-text-heading text-sm placeholder-text-heading/40 focus:outline-none focus:ring-2 focus:ring-primary"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleAddEmail()}
              />
              {addError && <p className="text-red-800 text-xs">{addError}</p>}
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowAddInput(false);
                    setNewEmail('');
                    setAddError(null);
                  }}
                  className="flex-1 py-2 rounded-lg text-sm font-medium text-text-heading/70 bg-surface-card hover:bg-surface-card-hover transition-colors"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={handleAddEmail}
                  className="flex-1 py-2 rounded-lg text-sm font-medium text-white bg-primary hover:bg-primary/90 transition-colors"
                >
                  {t('reports.add')}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowAddInput(true)}
              className="mt-3 flex items-center gap-1.5 text-sm text-text-heading/60 hover:text-text-heading transition-colors"
            >
              <PlusIcon className="w-4 h-4" />
              {t('reports.addEmail')}
            </button>
          )}
        </section>

        {/* Send Report Now button */}
        <button
          onClick={handleSendReport}
          disabled={sending || recipients.length === 0}
          className="w-full py-3 bg-btn-action text-white rounded-lg font-semibold transition-colors hover:bg-btn-action/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {sending ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              {t('reports.sendingReport')}
            </>
          ) : (
            t('reports.sendMonthly')
          )}
        </button>

        {/* Download CSV preview */}
        <button
          onClick={handleDownloadReport}
          disabled={downloading}
          className="w-full mt-3 py-3 border border-text-heading/20 text-text-heading rounded-lg font-semibold transition-colors hover:bg-surface-card disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {downloading ? (
            <>
              <div className="w-5 h-5 border-2 border-text-heading border-t-transparent rounded-full animate-spin" />
              {t('reports.generating')}
            </>
          ) : (
            t('reports.downloadCsv')
          )}
        </button>
      </div>
    </div>
  );
}
