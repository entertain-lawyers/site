'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Loader2, Save } from 'lucide-react';
import { updateSiteSettingsAction } from '@/modules/admin/admin-site-settings.actions';
import type { SiteSettings } from '@/lib/site-settings';
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

export default function SiteSettingsForm({ initial }: { initial: SiteSettings }) {
  const router = useRouter();
  const [form, setForm] = useState({
    organizationName: initial.organizationName,
    contactEmail: initial.contactEmail,
    contactPhone: initial.contactPhone,
    address: initial.address,
    facebookUrl: initial.facebookUrl,
    twitterUrl: initial.twitterUrl,
    instagramUrl: initial.instagramUrl,
    youtubeUrl: initial.youtubeUrl,
    footerCopyright: initial.footerCopyright ?? '',
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

    const result = await updateSiteSettingsAction(form);

    if (result?.success) {
      setSaved(true);
      router.refresh();
    } else {
      setError((result as { error?: string })?.error || 'Could not save site settings.');
    }

    setLoading(false);
  }

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
          Settings saved. The public site has been refreshed.
        </div>
      ) : null}

      <section className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm dark:border-white/5 dark:bg-zinc-900 sm:p-8">
        <h2 className="text-lg font-extrabold text-navy dark:text-white">Organisation</h2>
        <p className="mt-1 mb-6 text-sm text-text-secondary">
          Used in the footer, structured data and page titles.
        </p>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Organisation name">
            <input
              required
              maxLength={120}
              value={form.organizationName}
              onChange={(e) => update('organizationName', e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Contact email">
            <input
              required
              type="email"
              maxLength={200}
              value={form.contactEmail}
              onChange={(e) => update('contactEmail', e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Contact phone" hint="Displayed as entered; spaces are removed from the call link.">
            <input
              required
              maxLength={40}
              value={form.contactPhone}
              onChange={(e) => update('contactPhone', e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Address">
            <input
              required
              maxLength={300}
              value={form.address}
              onChange={(e) => update('address', e.target.value)}
              className={inputClass}
            />
          </Field>
        </div>
      </section>

      <section className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm dark:border-white/5 dark:bg-zinc-900 sm:p-8">
        <h2 className="text-lg font-extrabold text-navy dark:text-white">Social profiles</h2>
        <p className="mt-1 mb-6 text-sm text-text-secondary">
          Leave a field empty to hide that profile from the footer and contact page.
        </p>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Facebook">
            <input
              maxLength={500}
              placeholder="https://facebook.com/your-page"
              value={form.facebookUrl}
              onChange={(e) => update('facebookUrl', e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="X / Twitter">
            <input
              maxLength={500}
              placeholder="https://x.com/your-handle"
              value={form.twitterUrl}
              onChange={(e) => update('twitterUrl', e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Instagram">
            <input
              maxLength={500}
              placeholder="https://instagram.com/your-handle"
              value={form.instagramUrl}
              onChange={(e) => update('instagramUrl', e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="YouTube">
            <input
              maxLength={500}
              placeholder="https://youtube.com/@your-channel"
              value={form.youtubeUrl}
              onChange={(e) => update('youtubeUrl', e.target.value)}
              className={inputClass}
            />
          </Field>
        </div>
      </section>

      <section className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm dark:border-white/5 dark:bg-zinc-900 sm:p-8">
        <h2 className="text-lg font-extrabold text-navy dark:text-white">Footer notice</h2>
        <p className="mt-1 mb-6 text-sm text-text-secondary">
          Leave empty to use the automatic copyright line. Use <code className="rounded bg-black/5 px-1 py-0.5 text-xs">{'{year}'}</code> to
          insert the current year.
        </p>

        <Field
          label="Copyright / footer notice"
          hint={`Preview: ${form.footerCopyright ? form.footerCopyright.replace(/\{year\}/gi, String(new Date().getFullYear())) : `© ${new Date().getFullYear()} ${form.organizationName || 'Entertain Lawyers'} Pvt. Ltd. All rights reserved.`}`}
        >
          <input
            maxLength={500}
            placeholder="© {year} Your Organisation. All rights reserved."
            value={form.footerCopyright}
            onChange={(e) => update('footerCopyright', e.target.value)}
            className={inputClass}
          />
        </Field>
      </section>

      <div className="flex items-center justify-end gap-3">
        <MotionButton
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl bg-accent px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-accent/90 disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {loading ? 'Saving…' : 'Save settings'}
        </MotionButton>
      </div>
    </form>
  );
}
