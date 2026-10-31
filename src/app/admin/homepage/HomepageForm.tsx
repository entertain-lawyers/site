'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Loader2, Save } from 'lucide-react';
import { updateHomepageConfigAction } from '@/modules/admin/admin-site-settings.actions';
import type { HomepageConfig } from '@/lib/site-settings';
import { MotionButton } from '@/components/motion/primitives';

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

export default function HomepageForm({ initial }: { initial: HomepageConfig }) {
  const router = useRouter();
  const [form, setForm] = useState({
    heroHeading: initial.heroHeading,
    heroSubheading: initial.heroSubheading ?? '',
    heroCtaText: initial.heroCtaText ?? '',
    heroCtaLink: initial.heroCtaLink ?? '',
    announcementText: initial.announcementText ?? '',
    announcementLink: initial.announcementLink ?? '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  function update(key: keyof typeof form, value: string) {
    setSaved(false);
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError('');
    setSaved(false);

    const result = await updateHomepageConfigAction(form);

    if (result?.success) {
      setSaved(true);
      router.refresh();
    } else {
      setError((result as { error?: string })?.error || 'Could not save the homepage.');
    }

    setLoading(false);
  }

  const showCta = form.heroCtaText.trim() && form.heroCtaLink.trim();
  const showAnnouncement = form.announcementText.trim();

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      ) : null}

      {saved ? (
        <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-bold text-green-700">
          <CheckCircle2 className="h-4 w-4" />
          Homepage saved. The public page has been refreshed.
        </div>
      ) : null}

      <section className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm dark:border-white/5 dark:bg-zinc-900 sm:p-8">
        <h2 className="text-lg font-extrabold text-navy dark:text-white">Hero</h2>
        <p className="mt-1 mb-6 text-sm text-text-secondary">
          The heading is used as the accessible page heading and logo alt text. The tagline appears under the
          logo.
        </p>

        <div className="space-y-5">
          <Field label="Hero heading">
            <input
              required
              maxLength={200}
              value={form.heroHeading}
              onChange={(e) => update('heroHeading', e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field
            label="Tagline"
            hint="Leave empty to keep the built-in highlighted tagline. Plain text is shown when set."
          >
            <textarea
              rows={3}
              maxLength={600}
              value={form.heroSubheading}
              onChange={(e) => update('heroSubheading', e.target.value)}
              className={inputClass}
            />
          </Field>
        </div>
      </section>

      <section className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm dark:border-white/5 dark:bg-zinc-900 sm:p-8">
        <h2 className="text-lg font-extrabold text-navy dark:text-white">Call to action</h2>
        <p className="mt-1 mb-6 text-sm text-text-secondary">
          Optional button below the tagline. Fill both fields to show it.
        </p>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Button text">
            <input
              maxLength={80}
              placeholder="Start studying"
              value={form.heroCtaText}
              onChange={(e) => update('heroCtaText', e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Button link" hint="A path such as /study, or a full URL.">
            <input
              maxLength={500}
              placeholder="/study"
              value={form.heroCtaLink}
              onChange={(e) => update('heroCtaLink', e.target.value)}
              className={inputClass}
            />
          </Field>
        </div>
      </section>

      <section className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm dark:border-white/5 dark:bg-zinc-900 sm:p-8">
        <h2 className="text-lg font-extrabold text-navy dark:text-white">Announcement banner</h2>
        <p className="mt-1 mb-6 text-sm text-text-secondary">
          Optional slim banner above the hero. Leave the text empty to hide it.
        </p>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Banner text">
            <input
              maxLength={300}
              placeholder="New: LLB first-semester notes are live"
              value={form.announcementText}
              onChange={(e) => update('announcementText', e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Banner link" hint="Optional.">
            <input
              maxLength={500}
              placeholder="/study"
              value={form.announcementLink}
              onChange={(e) => update('announcementLink', e.target.value)}
              className={inputClass}
            />
          </Field>
        </div>
      </section>

      <section className="rounded-2xl border border-dashed border-black/10 bg-slate-50 p-6 dark:border-white/10 dark:bg-zinc-900/60 sm:p-8">
        <h2 className="text-sm font-bold uppercase tracking-wider text-text-muted">Preview</h2>
        <div className="mt-4 overflow-hidden rounded-xl border border-black/5 bg-white dark:border-white/10 dark:bg-zinc-950">
          {showAnnouncement ? (
            <div className="flex items-center justify-center gap-2 bg-accent px-4 py-2 text-center text-xs font-bold text-white">
              <span>{form.announcementText}</span>
              {form.announcementLink ? <span aria-hidden="true">→</span> : null}
            </div>
          ) : null}
          <div className="px-6 py-8 text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-text-muted">{form.heroHeading}</p>
            <p className="mx-auto mt-3 max-w-xl text-sm font-medium text-text-secondary">
              {form.heroSubheading || 'Nepal’s premium platform for law notes, case laws and study resources.'}
            </p>
            {showCta ? (
              <span className="mt-5 inline-flex rounded-full bg-accent px-5 py-2 text-xs font-bold text-white">
                {form.heroCtaText}
              </span>
            ) : null}
          </div>
        </div>
      </section>

      <div className="flex items-center justify-end gap-3">
        <MotionButton
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl bg-accent px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-accent/90 disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {loading ? 'Saving…' : 'Save homepage'}
        </MotionButton>
      </div>
    </form>
  );
}
