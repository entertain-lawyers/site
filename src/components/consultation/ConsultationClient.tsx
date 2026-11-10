'use client';

import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight, Building2, Calculator, Clock, Mail, MapPin, Phone, Scale, ShieldCheck, Sparkles,
} from 'lucide-react';
import type { ConsultationLawyer } from './ConsultationForm';
import LawyerProfileView from './LawyerProfileView';

interface ConsultationClientProps {
  lawyers: ConsultationLawyer[];
  loadError?: boolean;
}

function cityList(lawyer: ConsultationLawyer) {
  return lawyer.serviceCities || lawyer.location || lawyer.courtJurisdiction || '';
}

export default function ConsultationClient({ lawyers, loadError = false }: ConsultationClientProps) {
  return (
    <main className="min-h-screen bg-background py-10 sm:py-14">
      <div className="mx-auto max-w-6xl space-y-12 px-4 sm:px-6 lg:px-8">
        <header className="mx-auto max-w-3xl space-y-4 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/10 px-4 py-2 text-xs font-bold text-accent">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" /> Nepal Bar Council Advocates
          </span>
          <h1 className="text-3xl font-black tracking-tight text-navy dark:text-white sm:text-5xl">Consult a Lawyer</h1>
          <p className="text-base leading-relaxed text-text-secondary sm:text-lg">
            Find an advocate by practice area and service city, review their profile, then book a consultation or contact them directly.
          </p>
        </header>

        <section aria-labelledby="lawyers-heading" className="space-y-6">
          <div className="flex flex-col gap-2 border-b border-border pb-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-accent">
                <Scale className="h-4 w-4" aria-hidden="true" /> Lawyer directory
              </p>
              <h2 id="lawyers-heading" className="text-2xl font-extrabold text-navy dark:text-white sm:text-3xl">
                Find the right advocate
              </h2>
            </div>
            <Link
              href="/consultation/book"
              className="inline-flex items-center gap-2 text-sm font-bold text-accent underline-offset-4 hover:underline"
            >
              Book a general consultation &rarr;
            </Link>
          </div>

          {loadError ? (
            <div role="alert" className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6 text-center text-sm text-text-secondary">
              Lawyer profiles are temporarily unavailable. You can still submit a general consultation request.
            </div>
          ) : lawyers.length === 0 ? (
            <div className="rounded-2xl border border-border bg-surface p-8 text-center text-sm text-text-secondary">
              No lawyer profiles are published yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {lawyers.map((lawyer) => (
                <LawyerCard key={lawyer.id} lawyer={lawyer} />
              ))}
            </div>
          )}
        </section>

        <section aria-label="Chambers location and consultation resources" className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
          <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
            <iframe
              title="Entertain Lawyers chambers office map"
              src="https://www.google.com/maps?q=Prithvi%20Narayan%20Campus%2C%20Pokhara%2C%20Kaski%2C%20Nepal&output=embed"
              className="h-44 w-full border-0 sm:h-52"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
            <div className="space-y-4 p-5">
              <h2 className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-wide text-navy dark:text-white">
                <Building2 className="h-4 w-4 text-accent" aria-hidden="true" />
                Law Chambers Desk
              </h2>
              <ul className="space-y-3 text-sm text-text-secondary">
                <li className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
                  Prithvi Narayan Law Campus, Pokhara — Kaski, Gandaki Province, Nepal
                </li>
                <li className="flex items-center gap-2">
                  <Phone className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
                  <a href="tel:+9779822010737" className="font-semibold underline underline-offset-4">+977 9822010737</a>
                </li>
                <li className="flex items-center gap-2">
                  <Mail className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
                  <a href="mailto:contact@entertainlawyers.com" className="break-all font-semibold underline underline-offset-4">contact@entertainlawyers.com</a>
                </li>
                <li className="flex items-start gap-2">
                  <Clock className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
                  <span>Sunday–Friday, 10:00 AM–5:00 PM <span className="text-text-muted">(Closed Saturdays and court holidays)</span></span>
                </li>
              </ul>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
                <p className="text-xs text-text-muted">Requests are handled confidentially by the consultation team.</p>
                <a
                  href="https://www.google.com/maps/search/?api=1&query=Prithvi+Narayan+Campus,+Pokhara,+Kaski,+Nepal"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-3 py-2 text-xs font-bold text-accent hover:bg-accent hover:text-white"
                >
                  <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                  Directions
                </a>
              </div>
            </div>
          </div>

          {/* Attractive Interactive Legal Tool Card */}
          <div className="relative flex flex-col justify-between gap-6 overflow-hidden rounded-3xl bg-gradient-to-br from-[#0c192c] via-[#10243e] to-[#1e3250] p-7 text-white shadow-xl ring-1 ring-gold/25 sm:p-8">
            {/* Subtle background decorative balance watermark */}
            <div className="pointer-events-none absolute -right-8 -top-8 select-none text-white/[0.04]" aria-hidden="true">
              <Scale className="h-56 w-56" />
            </div>

            <div className="relative z-10 space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-xs font-black uppercase tracking-wider text-gold shadow-sm backdrop-blur">
                <Sparkles className="h-3.5 w-3.5 text-gold" aria-hidden="true" />
                Interactive Legal Tool
              </div>

              <div>
                <h2 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
                  Court Fee Calculator
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-300">
                  Instantly compute required filing fees for civil suits, property partitions, money recovery, and writ petitions under Nepal&apos;s National Civil Procedure Code 2074.
                </p>
              </div>

              <div className="flex flex-wrap gap-2 pt-1 text-[11px] font-bold text-slate-300">
                <span className="rounded-lg bg-white/10 px-2.5 py-1">Civil Suits</span>
                <span className="rounded-lg bg-white/10 px-2.5 py-1">Partition Claims</span>
                <span className="rounded-lg bg-white/10 px-2.5 py-1">Civil Code 2074</span>
              </div>
            </div>

            <div className="relative z-10 pt-2">
              <Link
                href="/calculator"
                className="group inline-flex w-full items-center justify-between gap-3 rounded-xl bg-accent px-5 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-accent/25 transition-all hover:bg-accent-hover hover:shadow-accent/40"
              >
                <span className="flex items-center gap-2">
                  <Calculator className="h-4 w-4" aria-hidden="true" />
                  Open Court Fee Calculator
                </span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

/**
 * Directory card in the visual language of the Team page: a full 4/5 portrait,
 * essential identity details, and exactly one primary action: "View More / Consult",
 * which navigates to the dedicated lawyer profile page.
 */
export function LawyerCard({ lawyer }: {
  lawyer: ConsultationLawyer;
  selected?: boolean;
  expanded?: boolean;
  onToggle?: () => void;
}) {
  return (
    <article className="flex min-w-0 flex-col border border-border rounded-2xl bg-surface shadow-sm overflow-hidden transition-[box-shadow,border-color] duration-300 hover:shadow-lg hover:border-accent/40">
      {/* Framed portrait (4/5 aspect ratio) */}
      <div className="p-3">
        <div className="relative w-full aspect-[4/5] rounded-lg overflow-hidden ring-1 ring-black/[0.06] dark:ring-white/[0.08] bg-slate-100 dark:bg-zinc-800">
          {lawyer.imageUrl ? (
            <Image
              src={lawyer.imageUrl}
              alt={`Portrait of ${lawyer.name}, ${lawyer.title || 'Advocate'}`}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
          ) : (
            <div aria-hidden="true" className="flex h-full w-full items-center justify-center text-5xl font-black text-accent">
              {lawyer.name.charAt(0).toUpperCase()}
            </div>
          )}
          {lawyer.isFeatured && (
            <span className="absolute top-3 right-3 rounded-full bg-white/85 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-accent shadow-sm backdrop-blur dark:bg-zinc-900/85">
              Featured
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col px-5 pb-5 pt-2">
        <h3 className="text-lg font-bold leading-tight text-navy dark:text-white">{lawyer.name}</h3>
        <p className="text-sm font-semibold text-accent">{lawyer.title || 'Advocate'}</p>

        {cityList(lawyer) && (
          <p className="mt-3 flex items-start gap-1.5 text-sm text-text-secondary">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
            <span className="line-clamp-2">{cityList(lawyer)}</span>
          </p>
        )}

        {/* Action: "View More / Consult" links to the dedicated lawyer profile page */}
        <div className="mt-auto space-y-2 border-t border-border pt-4">
          <Link
            href={`/consultation/${lawyer.slug}`}
            role="button"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-navy px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-navy-light dark:bg-accent dark:hover:bg-accent-hover"
          >
            View More / Consult
          </Link>
        </div>
      </div>
    </article>
  );
}

/**
 * Re-export LawyerProfileView as LawyerProfilePanel for backwards compatibility.
 */
export function LawyerProfilePanel({
  lawyer,
  onClose,
  onBook,
}: {
  lawyer: ConsultationLawyer;
  headingRef?: React.RefObject<HTMLHeadingElement | null>;
  onClose?: () => void;
  onBook?: () => void;
}) {
  return (
    <div>
      {onClose && (
        <div className="flex justify-end pb-2">
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-text-muted hover:underline"
          >
            Close Profile
          </button>
        </div>
      )}
      <LawyerProfileView lawyer={lawyer} />
      {onBook && (
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={onBook}
            className="rounded-xl bg-accent px-5 py-2.5 text-sm font-bold text-white"
          >
            Book a Consultation
          </button>
        </div>
      )}
    </div>
  );
}
