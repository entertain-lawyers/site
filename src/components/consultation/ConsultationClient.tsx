'use client';

import Image from 'next/image';
import Link from 'next/link';
import {
  MapPin, Scale, ShieldCheck,
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
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {lawyers.map((lawyer) => (
                <LawyerCard key={lawyer.id} lawyer={lawyer} />
              ))}
            </div>
          )}
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
