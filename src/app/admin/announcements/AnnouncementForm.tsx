'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  CheckCircle2,
  Loader2,
  Save,
  Eye,
  Megaphone,
  RotateCcw,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import {
  saveAnnouncementAction,
} from '@/modules/admin/admin-announcement.actions';
import {
  getAnnouncementStatus,
  INITIAL_ANNOUNCEMENT_TITLE,
  INITIAL_ANNOUNCEMENT_MESSAGE,
  type AnnouncementRecord,
} from '@/lib/announcements';
import { MotionButton } from '@/components/motion/primitives';
import AnnouncementModal from '@/components/home/AnnouncementModal';

const inputClass =
  'w-full rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 px-4 py-3 text-sm font-medium text-navy dark:text-white shadow-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20';

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-sm font-bold text-navy dark:text-white mb-2">{label}</span>
      {children}
      {hint ? <span className="mt-1.5 block text-xs font-medium text-text-muted">{hint}</span> : null}
    </label>
  );
}

// Convert ISO string to datetime-local format (YYYY-MM-DDTHH:mm)
function toDatetimeLocal(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

interface AnnouncementFormProps {
  initial: AnnouncementRecord;
  history?: AnnouncementRecord[];
}

export default function AnnouncementForm({ initial, history = [] }: AnnouncementFormProps) {
  const router = useRouter();

  const [id, setId] = useState(initial.id);
  const [form, setForm] = useState({
    title: initial.title,
    message: initial.message,
    isActive: initial.isActive,
    startDate: toDatetimeLocal(initial.startDate),
    expiryDate: toDatetimeLocal(initial.expiryDate),
    linkText: initial.linkText ?? '',
    linkUrl: initial.linkUrl ?? '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setSaved(false);
    setForm((current) => ({ ...current, [key]: value }));
  }

  function handleRestoreInitial() {
    setSaved(false);
    setForm((current) => ({
      ...current,
      title: INITIAL_ANNOUNCEMENT_TITLE,
      message: INITIAL_ANNOUNCEMENT_MESSAGE,
      isActive: true,
      startDate: '',
      expiryDate: '',
      linkText: '',
      linkUrl: '',
    }));
  }

  function handleLoadPastAnnouncement(announcement: AnnouncementRecord) {
    setSaved(false);
    setId(announcement.id);
    setForm({
      title: announcement.title,
      message: announcement.message,
      isActive: announcement.isActive,
      startDate: toDatetimeLocal(announcement.startDate),
      expiryDate: toDatetimeLocal(announcement.expiryDate),
      linkText: announcement.linkText ?? '',
      linkUrl: announcement.linkUrl ?? '',
    });
  }

  // Calculate live computed status based on current inputs
  const liveStatus = getAnnouncementStatus({
    isActive: form.isActive,
    startDate: form.startDate ? new Date(form.startDate).toISOString() : null,
    expiryDate: form.expiryDate ? new Date(form.expiryDate).toISOString() : null,
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSaved(false);

    const payload = {
      id: id || undefined,
      title: form.title.trim(),
      message: form.message.trim(),
      isActive: form.isActive,
      startDate: form.startDate ? new Date(form.startDate).toISOString() : undefined,
      expiryDate: form.expiryDate ? new Date(form.expiryDate).toISOString() : undefined,
      linkText: form.linkText.trim() || undefined,
      linkUrl: form.linkUrl.trim() || undefined,
    };

    const res = await saveAnnouncementAction(payload);

    if (res.success && res.data) {
      setSaved(true);
      setId(res.data.id);
      router.refresh();
    } else {
      setError((res as { error?: string })?.error || 'Could not save the announcement.');
    }

    setLoading(false);
  }

  const livePreviewAnnouncement: AnnouncementRecord = {
    id: id || 'preview-id',
    title: form.title || INITIAL_ANNOUNCEMENT_TITLE,
    message: form.message || INITIAL_ANNOUNCEMENT_MESSAGE,
    isActive: form.isActive,
    startDate: form.startDate ? new Date(form.startDate).toISOString() : null,
    expiryDate: form.expiryDate ? new Date(form.expiryDate).toISOString() : null,
    linkText: form.linkText || null,
    linkUrl: form.linkUrl || null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const paragraphs = (form.message || INITIAL_ANNOUNCEMENT_MESSAGE)
    .split(/\n\s*\n/)
    .filter((p) => p.trim());

  return (
    <>
      {/* Live Interactive Preview Modal (activated on demand by admin) */}
      {previewModalOpen ? (
        <AnnouncementModal
          announcement={{
            ...livePreviewAnnouncement,
            // Force random version so localStorage dismissal test doesn't hide it during preview
            updatedAt: new Date().toISOString(),
          }}
        />
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-6">
        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/40 px-4 py-3 text-sm font-medium text-red-700 dark:text-red-300">
            {error}
          </div>
        ) : null}

        {saved ? (
          <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 dark:border-green-900/50 dark:bg-green-950/40 px-4 py-3 text-sm font-bold text-green-700 dark:text-green-300">
            <CheckCircle2 className="h-4 w-4" />
            Announcement published successfully! The homepage popup has been refreshed.
          </div>
        ) : null}

        {/* Status & Quick Actions Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-black/5 bg-white p-5 shadow-sm dark:border-white/5 dark:bg-zinc-900">
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-navy dark:text-white">Current Status:</span>
            {liveStatus === 'active' && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                Active (Visible to Visitors)
              </span>
            )}
            {liveStatus === 'scheduled' && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 px-3 py-1 text-xs font-bold text-blue-600 dark:text-blue-400">
                <Clock className="h-3.5 w-3.5" />
                Scheduled (Upcoming)
              </span>
            )}
            {liveStatus === 'expired' && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-600 dark:text-amber-400">
                <AlertTriangle className="h-3.5 w-3.5" />
                Expired
              </span>
            )}
            {liveStatus === 'inactive' && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-500/10 px-3 py-1 text-xs font-bold text-zinc-500 dark:text-zinc-400">
                Disabled (Hidden)
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPreviewModalOpen(!previewModalOpen)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-black/10 dark:border-white/10 px-4 py-2 text-xs font-bold text-navy dark:text-white hover:bg-black/5 dark:hover:bg-white/5 transition"
            >
              <Eye className="h-3.5 w-3.5" />
              {previewModalOpen ? 'Close Live Preview' : 'Test Live Modal'}
            </button>

            <button
              type="button"
              onClick={handleRestoreInitial}
              className="inline-flex items-center gap-1.5 rounded-xl border border-black/10 dark:border-white/10 px-4 py-2 text-xs font-bold text-text-secondary hover:text-navy dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition"
              title="Reset fields to the initial website update notice"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset to Default Notice
            </button>
          </div>
        </div>

        {/* Content Section */}
        <section className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm dark:border-white/5 dark:bg-zinc-900 sm:p-8">
          <h2 className="text-lg font-extrabold text-navy dark:text-white mb-1">Announcement Content</h2>
          <p className="mb-6 text-sm text-text-secondary">
            Set the announcement title and message displayed inside the modal on the homepage.
          </p>

          <div className="space-y-5">
            <Field label="Announcement Title" hint="Max 150 characters.">
              <input
                required
                maxLength={150}
                placeholder="e.g. We're Updating Our Website!"
                value={form.title}
                onChange={(e) => update('title', e.target.value)}
                className={inputClass}
              />
            </Field>

            <Field
              label="Announcement Message"
              hint="Plain text. Use double returns to separate paragraphs. Team sign-offs like '— Team Entertain Lawyers' are styled automatically."
            >
              <textarea
                required
                rows={6}
                maxLength={3000}
                placeholder="Enter the announcement message here..."
                value={form.message}
                onChange={(e) => update('message', e.target.value)}
                className={inputClass}
              />
            </Field>
          </div>
        </section>

        {/* Visibility & Scheduling */}
        <section className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm dark:border-white/5 dark:bg-zinc-900 sm:p-8">
          <h2 className="text-lg font-extrabold text-navy dark:text-white mb-1">Visibility & Scheduling</h2>
          <p className="mb-6 text-sm text-text-secondary">
            Enable or disable this announcement, or schedule start and expiry dates.
          </p>

          <div className="space-y-5">
            {/* Active Toggle */}
            <div className="flex items-center justify-between rounded-xl border border-black/5 dark:border-white/10 bg-slate-50 dark:bg-zinc-800/50 p-4">
              <div>
                <span className="block text-sm font-bold text-navy dark:text-white">Enable Announcement</span>
                <span className="block text-xs font-medium text-text-secondary">
                  When enabled and within the date range, visitors will see this popup on the homepage.
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => update('isActive', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-zinc-300 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
              </label>
            </div>

            {/* Date Pickers */}
            <div className="grid gap-5 sm:grid-cols-2">
              <Field
                label="Start Date & Time (Optional)"
                hint="Leave empty to display immediately upon publishing."
              >
                <div className="flex items-center gap-2">
                  <input
                    type="datetime-local"
                    value={form.startDate}
                    onChange={(e) => update('startDate', e.target.value)}
                    className={inputClass}
                  />
                  {form.startDate ? (
                    <button
                      type="button"
                      onClick={() => update('startDate', '')}
                      className="rounded-xl border border-black/10 dark:border-white/10 px-3 py-3 text-xs font-bold text-text-muted hover:text-navy dark:hover:text-white"
                    >
                      Clear
                    </button>
                  ) : null}
                </div>
              </Field>

              <Field
                label="Expiry Date & Time (Optional)"
                hint="Leave empty to keep announcement active until manually disabled."
              >
                <div className="flex items-center gap-2">
                  <input
                    type="datetime-local"
                    value={form.expiryDate}
                    onChange={(e) => update('expiryDate', e.target.value)}
                    className={inputClass}
                  />
                  {form.expiryDate ? (
                    <button
                      type="button"
                      onClick={() => update('expiryDate', '')}
                      className="rounded-xl border border-black/10 dark:border-white/10 px-3 py-3 text-xs font-bold text-text-muted hover:text-navy dark:hover:text-white"
                    >
                      Clear
                    </button>
                  ) : null}
                </div>
              </Field>
            </div>
          </div>
        </section>

        {/* Optional Action Button */}
        <section className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm dark:border-white/5 dark:bg-zinc-900 sm:p-8">
          <h2 className="text-lg font-extrabold text-navy dark:text-white mb-1">Optional Action Button</h2>
          <p className="mb-6 text-sm text-text-secondary">
            Optionally add a secondary link button inside the popup modal next to the dismiss button.
          </p>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Button Text (Optional)" hint="e.g. View Updates, Contact Us">
              <input
                maxLength={80}
                placeholder="View Updates"
                value={form.linkText}
                onChange={(e) => update('linkText', e.target.value)}
                className={inputClass}
              />
            </Field>

            <Field label="Button Link (Optional)" hint="A path such as /contact or a full URL.">
              <input
                maxLength={500}
                placeholder="/contact"
                value={form.linkUrl}
                onChange={(e) => update('linkUrl', e.target.value)}
                className={inputClass}
              />
            </Field>
          </div>
        </section>

        {/* Live Preview Panel */}
        <section className="rounded-2xl border border-dashed border-black/10 bg-slate-50 p-6 dark:border-white/10 dark:bg-zinc-900/60 sm:p-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-text-muted">Live Appearance Preview</h2>
            <span className="text-xs font-medium text-text-muted">Matches homepage styling</span>
          </div>

          <div className="flex items-center justify-center py-6 px-2">
            <div className="w-full max-w-lg rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 p-6 sm:p-8 shadow-xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent/10 dark:bg-accent/20 text-accent">
                  <Megaphone className="h-5 w-5" />
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-accent">Notice</span>
              </div>

              <h3 className="text-xl sm:text-2xl font-black text-navy dark:text-white tracking-tight leading-snug">
                {form.title || 'Untitled Announcement'}
              </h3>

              <div className="mt-4 space-y-3 text-sm sm:text-base text-text-secondary dark:text-zinc-300 leading-relaxed font-medium">
                {paragraphs.map((p, idx) => {
                  const trimmed = p.trim();
                  const isSignOff =
                    trimmed.startsWith('—') || trimmed.startsWith('-') || trimmed.includes('Team Entertain Lawyers');

                  if (isSignOff) {
                    return (
                      <p
                        key={idx}
                        className="mt-4 pt-3 border-t border-black/5 dark:border-white/5 text-xs sm:text-sm font-bold text-navy dark:text-white"
                      >
                        {trimmed.replace(/\*\*/g, '')}
                      </p>
                    );
                  }

                  return (
                    <p key={idx} className="whitespace-pre-line">
                      {trimmed}
                    </p>
                  );
                })}
              </div>

              <div className="mt-6 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-3 pt-2">
                {form.linkUrl && form.linkText ? (
                  <span className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-black/10 dark:border-white/10 px-5 py-2.5 text-sm font-bold text-navy dark:text-white">
                    {form.linkText}
                  </span>
                ) : null}
                <span className="inline-flex items-center justify-center rounded-xl bg-accent px-6 py-2.5 text-sm font-bold text-white shadow-sm">
                  I Understand
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Submit Actions */}
        <div className="flex items-center justify-end gap-3">
          <MotionButton
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl bg-accent px-7 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-accent-hover disabled:opacity-60 cursor-pointer"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {loading ? 'Publishing…' : 'Save & Publish Announcement'}
          </MotionButton>
        </div>

        {/* History / Previous Announcements */}
        {history.length > 0 ? (
          <section className="mt-10 rounded-2xl border border-black/5 bg-white p-6 shadow-sm dark:border-white/5 dark:bg-zinc-900 sm:p-8">
            <h2 className="text-base font-extrabold text-navy dark:text-white mb-1">Previous Announcements</h2>
            <p className="text-xs text-text-secondary mb-4">
              Select any previous announcement to quickly load its content back into the editor.
            </p>

            <div className="divide-y divide-black/5 dark:divide-white/5">
              {history.map((item) => (
                <div key={item.id} className="py-3 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-navy dark:text-white truncate">{item.title}</p>
                    <p className="text-xs text-text-muted">
                      Updated {new Date(item.updatedAt).toLocaleDateString()} &middot;{' '}
                      {item.isActive ? 'Active' : 'Disabled'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleLoadPastAnnouncement(item)}
                    className="shrink-0 text-xs font-bold text-accent hover:underline"
                  >
                    Load into editor &rarr;
                  </button>
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </form>
    </>
  );
}
