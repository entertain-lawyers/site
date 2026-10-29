'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Users, AlertTriangle, CheckCircle2, X, Loader2, Image as ImageIcon, ArrowRight } from 'lucide-react';
import {
  previewTeamImportAction,
  executeTeamImportAction,
} from '@/modules/admin/admin-team-import.actions';

export default function BulkImportTeamDialog() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [preview, setPreview] = useState<any>(null);
  const [uploadPhotos, setUploadPhotos] = useState(true);

  const handleOpen = () => {
    setIsOpen(true);
    setError('');
    setSuccess('');
    setPreview(null);
  };

  const handleClose = () => {
    if (executing) return;
    setIsOpen(false);
    setPreview(null);
    setError('');
  };

  const handlePreview = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await previewTeamImportAction();
      if (!res.success) {
        setError(res.error);
        setPreview(null);
      } else {
        setPreview(res.data);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to inspect backup data');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    setExecuting(true);
    setError('');
    setSuccess('');
    try {
      const res = await executeTeamImportAction({
        uploadPhotosToStorage: uploadPhotos,
        forcePublish: false, // Strict restriction: remain unpublished for review
      });

      if (!res.success) {
        setError(res.error || 'Bulk import failed with errors.');
      } else {
        const summary = `Bulk import finished: ${res.data.createdCount} created, ${res.data.updatedCount} updated, ${res.data.photosUploadedCount} photos uploaded.`;
        if (!res.data.success) {
          setError(`${summary} ${res.data.errors.length} record(s) failed. First error: ${res.data.errors[0]}`);
        } else {
          setSuccess(summary);
          setTimeout(() => {
            setIsOpen(false);
            router.refresh();
          }, 1800);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to execute import');
    } finally {
      setExecuting(false);
    }
  };

  return (
    <>
      <button
        onClick={handleOpen}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-all shadow-sm"
        title="Preview and bulk import preserved team profiles"
      >
        <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
        <span>Bulk Import Team</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-black/10 dark:border-white/10 w-full max-w-3xl overflow-hidden my-8">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-black/5 dark:border-white/5 bg-slate-50 dark:bg-zinc-800/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-700 dark:text-blue-300">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-navy dark:text-white">Bulk Team Profile Import</h3>
                  <p className="text-xs text-text-secondary">
                    Validate profile data and photos, map images to production B2 storage, and import idempotently.
                  </p>
                </div>
              </div>
              <button
                onClick={handleClose}
                disabled={executing}
                className="text-text-muted hover:text-navy dark:hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
              {error && (
                <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-sm flex items-start gap-2.5">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-600" />
                  <span>{error}</span>
                </div>
              )}

              {success && (
                <div className="p-4 rounded-xl bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-900 text-green-700 dark:text-green-300 text-sm flex items-start gap-2.5">
                  <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5 text-green-600" />
                  <span>{success}</span>
                </div>
              )}

              {!preview && (
                <div className="text-center py-6 space-y-4">
                  <div className="w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center mx-auto text-blue-600 dark:text-blue-400">
                    <Users className="w-8 h-8" />
                  </div>
                  <div className="max-w-md mx-auto">
                    <h4 className="text-base font-bold text-navy dark:text-white mb-1">
                      Ready to inspect 5 preserved team profiles
                    </h4>
                    <p className="text-xs text-text-secondary">
                      Inspects <code>team_members_backup.json</code>, verifies local photo existence, and checks for existing records to prevent duplication.
                    </p>
                  </div>
                  <button
                    onClick={handlePreview}
                    disabled={loading}
                    className="py-2.5 px-6 rounded-xl bg-accent text-white font-bold text-sm hover:bg-accent/90 disabled:opacity-50 inline-flex items-center gap-2 transition-all shadow-md"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Validating Profiles & Photos...</span>
                      </>
                    ) : (
                      <>
                        <span>Run Dry-Run Preview</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              )}

              {preview && (
                <div className="space-y-4">
                  {/* Summary Bar */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-800 text-xs">
                    <div>
                      <span className="text-text-muted">Total Profiles:</span>{' '}
                      <strong className="text-navy dark:text-white">{preview.total}</strong>
                    </div>
                    <div>
                      <span className="text-text-muted">In Database:</span>{' '}
                      <strong className="text-amber-600 font-bold">{preview.existingInDbCount}</strong>
                    </div>
                    <div>
                      <span className="text-text-muted">New Records:</span>{' '}
                      <strong className="text-green-600 font-bold">{preview.newRecordsCount}</strong>
                    </div>
                    <div>
                      <span className="text-text-muted">Photos Verified:</span>{' '}
                      <strong className="text-blue-600 font-bold">
                        {preview.localPhotosFoundCount}/{preview.total}
                      </strong>
                    </div>
                  </div>

                  {/* Profile List */}
                  <div className="space-y-3">
                    {preview.items.map((item: any) => (
                      <div
                        key={item.slug}
                        className="p-4 rounded-xl border border-black/5 dark:border-white/5 bg-white dark:bg-zinc-900 space-y-2.5 shadow-sm"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-black/5 dark:border-white/5 pb-2">
                          <div>
                            <span className="font-bold text-sm text-navy dark:text-white mr-2">{item.name}</span>
                            <span className="text-xs text-text-muted">({item.designation})</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                                item.status === 'EXISTS_IN_DB'
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                                  : 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'
                              }`}
                            >
                              {item.status === 'EXISTS_IN_DB' ? 'Exists (Will Update)' : 'New Record'}
                            </span>
                            <span
                              className={`text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                                item.photoExistsLocally
                                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
                                  : 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'
                              }`}
                            >
                              <ImageIcon className="w-3 h-3" />
                              {item.photoExistsLocally
                                ? `${(item.photoSizeBytes / 1024).toFixed(0)} KB`
                                : 'Photo Missing'}
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-text-secondary">
                          <div>
                            <span className="text-text-muted">Slug:</span> <code>{item.slug}</code>
                          </div>
                          <div>
                            <span className="text-text-muted">Instagram:</span>{' '}
                            {item.instagramUrl ? (
                              <span className="text-accent underline truncate inline-block max-w-[200px] align-bottom">
                                {item.instagramUrl}
                              </span>
                            ) : (
                              <span className="text-text-muted">None</span>
                            )}
                          </div>
                          {item.qualifications && (
                            <div className="col-span-1 sm:col-span-2">
                              <span className="text-text-muted">Qualifications:</span> {item.qualifications}
                            </div>
                          )}
                          <div>
                            <span className="text-text-muted">Storage Destination:</span>{' '}
                            <code className="text-[10px]">{item.targetB2Key}</code>
                          </div>
                          <div>
                            <span className="text-text-muted">Target Public URL:</span>{' '}
                            <code className="text-[10px]">{item.targetPublicUrl}</code>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Options & Action */}
                  <div className="pt-4 border-t border-black/5 dark:border-white/5 space-y-4">
                    <label className="flex items-center gap-2.5 text-xs text-navy dark:text-zinc-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={uploadPhotos}
                        onChange={(e) => setUploadPhotos(e.target.checked)}
                        className="rounded border-gray-300 text-accent focus:ring-accent"
                      />
                      <span>
                        Upload local photos to B2 storage (or local proxy) and store <code>/api/media/...</code> URLs
                      </span>
                    </label>

                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/60 text-xs text-text-secondary">
                      🔒 <strong>Safety Note:</strong> Profiles will be imported in <strong>unpublished</strong> status so you can review content and image rendering before publishing.
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setPreview(null)}
                        disabled={executing}
                        className="px-4 py-2 rounded-xl border border-black/10 dark:border-white/10 text-xs font-bold text-text-secondary hover:bg-slate-100 dark:hover:bg-zinc-800"
                      >
                        Re-inspect
                      </button>
                      <button
                        type="button"
                        onClick={handleImport}
                        disabled={executing}
                        className="px-5 py-2 rounded-xl bg-accent hover:bg-accent/90 text-white text-xs font-bold disabled:opacity-40 flex items-center gap-2 transition-all shadow-md"
                      >
                        {executing ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Importing Profiles & Photos...</span>
                          </>
                        ) : (
                          <span>Execute Bulk Import</span>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
