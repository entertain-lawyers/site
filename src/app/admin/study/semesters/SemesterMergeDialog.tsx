'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { GitMerge, AlertTriangle, CheckCircle2, X, Loader2, ArrowRight } from 'lucide-react';
import {
  previewSemesterMergeAction,
  mergeSemestersAction,
} from '@/modules/admin/admin-semester-merge.actions';
import { useEscapeKey } from '@/hooks/use-escape-key';
import { AnimatePresence, Appear, Backdrop, DialogPanel } from '@/components/motion/primitives';

interface SemesterOption {
  id: string;
  name: string;
  order: number;
}

interface SemesterMergeDialogProps {
  semesters: SemesterOption[];
}

export default function SemesterMergeDialog({ semesters }: SemesterMergeDialogProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [sourceId, setSourceId] = useState('');
  const [targetId, setTargetId] = useState('');
  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [preview, setPreview] = useState<any>(null);
  const [confirmationInput, setConfirmationInput] = useState('');
  const [removeEmptySubjects, setRemoveEmptySubjects] = useState(true);

  const handleOpen = () => {
    setIsOpen(true);
    setError('');
    setSuccess('');
    setPreview(null);
    setConfirmationInput('');
  };

  const handleClose = () => {
    if (executing) return;
    setIsOpen(false);
    setPreview(null);
    setError('');
  };
  useEscapeKey(isOpen, handleClose);

  const handlePreview = async () => {
    if (!sourceId || !targetId) {
      setError('Please select both a source semester and target semester.');
      return;
    }
    if (sourceId === targetId) {
      setError('Source and target must be different semesters.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await previewSemesterMergeAction({ sourceId, targetId });
      if (!res.success) {
        setError(res.error);
        setPreview(null);
      } else {
        setPreview(res.data);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to generate preview');
    } finally {
      setLoading(false);
    }
  };

  const handleMerge = async () => {
    if (confirmationInput.trim().toUpperCase() !== 'CONFIRM') {
      setError('Please type CONFIRM exactly to proceed.');
      return;
    }

    setExecuting(true);
    setError('');
    try {
      const res = await mergeSemestersAction({
        sourceId,
        targetId,
        confirmationPhrase: confirmationInput,
        removeEmptyTestSubjects: removeEmptySubjects,
        deleteSourceSemester: true,
      });

      if (!res.success) {
        setError(res.error);
      } else {
        setSuccess(
          `Successfully consolidated "${res.data.sourceName}" into "${res.data.targetName}". Moved ${res.data.movedDirectResources} resources, deleted ${res.data.deletedEmptySubjectsCount} empty subjects, and reassigned ${res.data.reassignedSubjectsCount} subjects.`
        );
        setTimeout(() => {
          setIsOpen(false);
          router.refresh();
        }, 1500);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to execute consolidation');
    } finally {
      setExecuting(false);
    }
  };

  return (
    <>
      <button
        onClick={handleOpen}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-all shadow-sm"
        title="Consolidate duplicate semesters safely"
      >
        <GitMerge className="w-4 h-4 text-amber-600 dark:text-amber-400" />
        <span>Merge Semesters</span>
      </button>

      <AnimatePresence>
      {isOpen && (
        <Backdrop key="semester-merge" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <DialogPanel role="dialog" aria-modal="true" className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-black/10 dark:border-white/10 w-full max-w-2xl overflow-hidden my-8">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-black/5 dark:border-white/5 bg-slate-50 dark:bg-zinc-800/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center text-amber-700 dark:text-amber-300">
                  <GitMerge className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-navy dark:text-white">Merge & Consolidate Semesters</h3>
                  <p className="text-xs text-text-secondary">
                    Safely reassign child subjects and resources, prune duplicate test artifacts, and remove duplicate entries.
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
            <div className="p-6 space-y-6">
              <AnimatePresence initial={false}>
              {error && (
                <Appear key="error">
                <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-sm flex items-start gap-2.5">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-600" />
                  <span>{error}</span>
                </div>
                </Appear>
              )}
              </AnimatePresence>

              <AnimatePresence initial={false}>
              {success && (
                <Appear key="success">
                <div className="p-4 rounded-xl bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-900 text-green-700 dark:text-green-300 text-sm flex items-start gap-2.5">
                  <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5 text-green-600" />
                  <span>{success}</span>
                </div>
                </Appear>
              )}
              </AnimatePresence>

              {/* Step 1: Select Semesters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-2">
                    Source (Duplicate to Remove)
                  </label>
                  <select
                    value={sourceId}
                    onChange={(e) => {
                      setSourceId(e.target.value);
                      setPreview(null);
                    }}
                    disabled={loading || executing}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-black/10 dark:border-white/10 bg-slate-50 dark:bg-zinc-800 text-navy dark:text-white text-sm font-medium focus:ring-2 focus:ring-accent outline-none"
                  >
                    <option value="">Select source semester...</option>
                    {semesters.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} (Order: {s.order})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-2">
                    Target (Canonical Destination)
                  </label>
                  <select
                    value={targetId}
                    onChange={(e) => {
                      setTargetId(e.target.value);
                      setPreview(null);
                    }}
                    disabled={loading || executing}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-black/10 dark:border-white/10 bg-slate-50 dark:bg-zinc-800 text-navy dark:text-white text-sm font-medium focus:ring-2 focus:ring-accent outline-none"
                  >
                    <option value="">Select target semester...</option>
                    {semesters
                      .filter((s) => s.id !== sourceId)
                      .map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} (Order: {s.order})
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {!preview && (
                <div className="pt-2">
                  <button
                    onClick={handlePreview}
                    disabled={!sourceId || !targetId || sourceId === targetId || loading}
                    className="w-full py-2.5 px-4 rounded-xl bg-accent text-white font-bold text-sm hover:bg-accent/90 disabled:opacity-50 flex items-center justify-center gap-2 transition-all shadow-md"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Analyzing Dependencies...</span>
                      </>
                    ) : (
                      <>
                        <span>Inspect & Generate Preview</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Step 2: Preview Details */}
              {preview && (
                <div className="space-y-4 pt-2 border-t border-black/5 dark:border-white/5">
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-black/5 dark:border-white/5 space-y-3">
                    <div className="flex items-center justify-between text-sm font-semibold text-navy dark:text-white border-b border-black/5 dark:border-white/5 pb-2">
                      <span>Source: {preview.source.name}</span>
                      <span className="text-text-muted text-xs">ID: {preview.source.id.slice(0, 8)}...</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-text-muted">Subjects:</span>{' '}
                        <strong className="text-navy dark:text-white">{preview.source.subjectCount}</strong>
                      </div>
                      <div>
                        <span className="text-text-muted">Direct Resources:</span>{' '}
                        <strong className="text-navy dark:text-white">{preview.source.directResourceCount}</strong>
                      </div>
                      <div>
                        <span className="text-text-muted">Units in Subjects:</span>{' '}
                        <strong className="text-navy dark:text-white">{preview.source.unitCount}</strong>
                      </div>
                      <div>
                        <span className="text-text-muted">Indirect Resources:</span>{' '}
                        <strong className="text-navy dark:text-white">{preview.source.indirectResourceCount}</strong>
                      </div>
                    </div>

                    {preview.source.subjects.length > 0 && (
                      <div className="mt-3 pt-2 border-t border-black/5 dark:border-white/5">
                        <div className="text-xs font-bold text-text-muted mb-1.5 uppercase">
                          Subjects in Source:
                        </div>
                        <ul className="space-y-1">
                          {preview.source.subjects.map((s: any) => (
                            <li
                              key={s.id}
                              className="text-xs flex items-center justify-between py-1 px-2 rounded bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/5"
                            >
                              <span className="font-medium text-navy dark:text-white">{s.name}</span>
                              <span className="text-text-muted">
                                {s.isEmpty ? (
                                  <span className="text-amber-600 dark:text-amber-400 font-semibold">
                                    Empty test artifact (0 units, 0 resources)
                                  </span>
                                ) : (
                                  `${s.unitCount} units, ${s.resourceCount} resources`
                                )}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Merge Options */}
                  <div className="space-y-3 pt-2">
                    <label className="flex items-center gap-2.5 text-xs text-navy dark:text-zinc-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={removeEmptySubjects}
                        onChange={(e) => setRemoveEmptySubjects(e.target.checked)}
                        className="rounded border-gray-300 text-accent focus:ring-accent"
                      />
                      <span>
                        Prune empty test subjects (e.g. <code>Sub1</code> with 0 units and 0 resources)
                      </span>
                    </label>

                    <div>
                      <label className="block text-xs font-bold text-text-muted uppercase mb-1">
                        Type <code>CONFIRM</code> to authorize consolidation:
                      </label>
                      <input
                        type="text"
                        value={confirmationInput}
                        onChange={(e) => setConfirmationInput(e.target.value)}
                        placeholder="Type CONFIRM"
                        disabled={executing}
                        className="w-full px-3.5 py-2 rounded-xl border border-black/10 dark:border-white/10 bg-slate-50 dark:bg-zinc-800 text-navy dark:text-white text-sm font-mono focus:ring-2 focus:ring-accent outline-none"
                      />
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-black/5 dark:border-white/5">
                    <button
                      type="button"
                      onClick={() => setPreview(null)}
                      disabled={executing}
                      className="px-4 py-2 rounded-xl border border-black/10 dark:border-white/10 text-xs font-bold text-text-secondary hover:bg-slate-100 dark:hover:bg-zinc-800"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={handleMerge}
                      disabled={confirmationInput.trim().toUpperCase() !== 'CONFIRM' || executing}
                      className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold disabled:opacity-40 flex items-center gap-2 transition-all shadow-md"
                    >
                      {executing ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Consolidating...</span>
                        </>
                      ) : (
                        <span>Execute Merge & Delete Source</span>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </DialogPanel>
        </Backdrop>
      )}
      </AnimatePresence>
    </>
  );
}
