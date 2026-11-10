'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import {
  Award, BriefcaseBusiness, Building2, Calculator, Camera, ChevronDown, ChevronUp, Clock, GraduationCap,
  Mail, MapPin, MessageCircle, Phone, Scale, ShieldCheck, Users, X, Globe2,
} from 'lucide-react';
import Link from 'next/link';
import ConsultationForm, { ConsultationLawyer } from './ConsultationForm';

interface ConsultationClientProps {
  lawyers: ConsultationLawyer[];
  loadError?: boolean;
}

function digits(value?: string | null) {
  return (value || '').replace(/\D/g, '');
}

function phoneHref(value?: string | null) {
  const number = (value || '').trim();
  return number ? `tel:${number.replace(/[^+\d]/g, '')}` : undefined;
}

function whatsappHref(value?: string | null, name?: string) {
  const raw = digits(value);
  if (raw.length < 7) return undefined;
  const international = raw.startsWith('00') ? raw.slice(2) : raw;
  const explicitlyInternational = (value || '').trim().startsWith('+') || raw.startsWith('00');
  const number = explicitlyInternational || international.startsWith('977') ? international : `977${international.replace(/^0+/, '')}`;
  return `https://wa.me/${number}?text=${encodeURIComponent(`Namaste Advocate ${name || ''}, I would like to book a consultation.`)}`;
}

function cityList(lawyer: ConsultationLawyer) {
  return lawyer.serviceCities || lawyer.location || lawyer.courtJurisdiction || '';
}

function safeExternalHref(value?: string | null) {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : undefined;
  } catch {
    return undefined;
  }
}

export default function ConsultationClient({ lawyers, loadError = false }: ConsultationClientProps) {
  const [selectedLawyer, setSelectedLawyer] = useState<ConsultationLawyer | null>(null);
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const [isFormHighlighted, setIsFormHighlighted] = useState(false);
  const bookingFormRef = useRef<HTMLElement>(null);
  const profileHeadingRef = useRef<HTMLHeadingElement>(null);

  const profileLawyer = lawyers.find((lawyer) => lawyer.id === activeProfileId) ?? null;

  const openProfile = (lawyer: ConsultationLawyer) => {
    setActiveProfileId((current) => (current === lawyer.id ? null : lawyer.id));
  };

  const handleBook = (lawyer: ConsultationLawyer) => {
    // Keep the profile open and the selected lawyer pinned to the intake form.
    setSelectedLawyer(lawyer);
    setIsFormHighlighted(true);
    window.setTimeout(() => bookingFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
  };

  // Focus the expanded profile heading and let Escape collapse it.
  useEffect(() => {
    if (!profileLawyer) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    profileHeadingRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setActiveProfileId(null);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      window.removeEventListener('keydown', closeOnEscape);
      if (previousFocus instanceof HTMLElement && document.body.contains(previousFocus)) {
        previousFocus.focus();
      }
    };
  }, [profileLawyer]);

  useEffect(() => {
    if (!isFormHighlighted) return;
    const timer = window.setTimeout(() => setIsFormHighlighted(false), 1800);
    return () => window.clearTimeout(timer);
  }, [isFormHighlighted]);

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
              <p className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-accent"><Scale className="h-4 w-4" aria-hidden="true" /> Lawyer directory</p>
              <h2 id="lawyers-heading" className="text-2xl font-extrabold text-navy dark:text-white sm:text-3xl">Find the right advocate</h2>
            </div>
            <a href="#booking-form" className="text-sm font-bold text-accent underline-offset-4 hover:underline">Go to consultation form</a>
          </div>

          {loadError ? (
            <div role="alert" className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6 text-center text-sm text-text-secondary">
              Lawyer profiles are temporarily unavailable. You can still submit a general consultation request below.
            </div>
          ) : lawyers.length === 0 ? (
            <div className="rounded-2xl border border-border bg-surface p-8 text-center text-sm text-text-secondary">No lawyer profiles are published yet.</div>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {lawyers.map((lawyer) => (
                <LawyerCard
                  key={lawyer.id}
                  lawyer={lawyer}
                  selected={selectedLawyer?.id === lawyer.id}
                  expanded={activeProfileId === lawyer.id}
                  onToggle={() => openProfile(lawyer)}
                />
              ))}
            </div>
          )}

          {profileLawyer && !loadError && (
            <LawyerProfilePanel
              key={profileLawyer.id}
              lawyer={profileLawyer}
              headingRef={profileHeadingRef}
              onClose={() => setActiveProfileId(null)}
              onBook={() => handleBook(profileLawyer)}
            />
          )}
        </section>

        <section id="booking-form" ref={bookingFormRef} aria-labelledby="booking-heading" className="scroll-mt-20 space-y-4">
          <div className="mx-auto max-w-3xl text-center">
            <h2 id="booking-heading" className="text-2xl font-extrabold text-navy dark:text-white sm:text-3xl">Book a Consultation</h2>
            <p className="mt-2 text-sm text-text-secondary">{selectedLawyer ? `Your request will be sent to Advocate ${selectedLawyer.name} for review.` : 'Share your contact details and describe your legal problem in English, Nepali, or a mix of both.'}</p>
          </div>
          <div className="mx-auto max-w-3xl">
            <ConsultationForm lawyers={lawyers} selectedLawyer={selectedLawyer} onSelectLawyer={setSelectedLawyer} isHighlighted={isFormHighlighted} />
          </div>
        </section>

        <section aria-label="Chambers location and consultation resources" className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
          <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
            <iframe title="Entertain Lawyers chambers office map" src="https://www.google.com/maps?q=Prithvi%20Narayan%20Campus%2C%20Pokhara%2C%20Kaski%2C%20Nepal&output=embed" className="h-44 w-full border-0 sm:h-52" loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
            <div className="space-y-4 p-5">
              <h2 className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-wide text-navy dark:text-white"><Building2 className="h-4 w-4 text-accent" aria-hidden="true" />Law Chambers Desk</h2>
              <ul className="space-y-3 text-sm text-text-secondary">
                <li className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />Prithvi Narayan Law Campus, Pokhara — Kaski, Gandaki Province, Nepal</li>
                <li className="flex items-center gap-2"><Phone className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" /><a href="tel:+9779822010737" className="font-semibold underline underline-offset-4">+977 9822010737</a></li>
                <li className="flex items-center gap-2"><Mail className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" /><a href="mailto:contact@entertainlawyers.com" className="break-all font-semibold underline underline-offset-4">contact@entertainlawyers.com</a></li>
                <li className="flex items-start gap-2"><Clock className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" /><span>Sunday–Friday, 10:00 AM–5:00 PM <span className="text-text-muted">(Closed Saturdays and court holidays)</span></span></li>
              </ul>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
                <p className="text-xs text-text-muted">Requests are handled confidentially by the consultation team.</p>
                <a href="https://www.google.com/maps/search/?api=1&query=Prithvi+Narayan+Campus,+Pokhara,+Kaski,+Nepal" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-3 py-2 text-xs font-bold text-accent hover:bg-accent hover:text-white"><MapPin className="h-3.5 w-3.5" aria-hidden="true" />Directions</a>
              </div>
            </div>
          </div>
          <div className="flex flex-col justify-between gap-4 rounded-2xl bg-gradient-to-br from-navy to-navy-dark p-6 text-white shadow-sm sm:p-7">
            <div className="space-y-3">
              <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gold"><Scale className="h-4 w-4" aria-hidden="true" />Interactive legal tool</p>
              <h2 className="text-xl font-extrabold">Court Fee Calculator</h2>
              <p className="text-sm leading-relaxed text-slate-300">Estimate filing fees for civil claims, property partition and monetary disputes under the National Civil Procedure Code 2074.</p>
            </div>
            <Link href="/calculator" className="inline-flex w-fit items-center gap-2 rounded-full bg-accent px-4 py-2.5 text-sm font-bold text-white hover:bg-accent-hover"><Calculator className="h-4 w-4" aria-hidden="true" />Open Court Fee Calculator</Link>
          </div>
        </section>
      </div>
    </main>
  );
}

/**
 * Directory card in the visual language of the Team page: a full 4/5 portrait,
 * essential identity details, and exactly one primary action that expands the
 * lawyer's profile inline. All contact/biography detail lives in the profile.
 */
export function LawyerCard({ lawyer, selected = false, expanded = false, onToggle }: {
  lawyer: ConsultationLawyer;
  selected?: boolean;
  expanded?: boolean;
  onToggle: () => void;
}) {
  const primaryPractice = (lawyer.practiceAreas || lawyer.specialization || '')
    .split(/[,\n]/).map((value) => value.trim()).filter(Boolean)[0];
  return (
    <article
      className={`flex min-w-0 flex-col border rounded-2xl bg-surface shadow-sm overflow-hidden transition-[box-shadow,border-color] duration-300 hover:shadow-lg ${
        selected ? 'border-accent ring-2 ring-accent/20' : expanded ? 'border-accent' : 'border-border'
      }`}
    >
      {/* Framed portrait — white mat and hairline ring, matching the Team page */}
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

        {primaryPractice && <p className="mt-2 text-sm text-text-secondary">{primaryPractice}</p>}
        {cityList(lawyer) && (
          <p className="mt-2 flex items-start gap-1.5 text-sm text-text-secondary">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
            <span className="line-clamp-2">{cityList(lawyer)}</span>
          </p>
        )}

        {/* Single primary action — the collapsed card offers nothing else */}
        <div className="mt-auto space-y-2 border-t border-border pt-4">
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={expanded}
            aria-controls="consult-lawyer-profile"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-navy px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-navy-light dark:bg-accent dark:hover:bg-accent-hover"
          >
            {expanded ? (
              <>
                <ChevronUp className="h-4 w-4" aria-hidden="true" /> Close Profile
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4" aria-hidden="true" /> View More
              </>
            )}
          </button>
        </div>
      </div>
    </article>
  );
}

/**
 * Expanded profile, rendered inline below the directory grid so it stays
 * visually connected to the selected card. Portrait + identity on the left,
 * biography and details in the main column, booking as the primary action.
 */
export function LawyerProfilePanel({ lawyer, headingRef, onClose, onBook }: {
  lawyer: ConsultationLawyer;
  headingRef?: React.RefObject<HTMLHeadingElement | null>;
  onClose: () => void;
  onBook: () => void;
}) {
  const call = phoneHref(lawyer.phone);
  const whatsapp = whatsappHref(lawyer.whatsappNumber || lawyer.phone, lawyer.name);
  const mapHref = safeExternalHref(lawyer.officeMapUrl) || (lawyer.officeAddress || lawyer.location ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lawyer.officeAddress || lawyer.location || '')}` : undefined);
  const socialLinks = [
    [safeExternalHref(lawyer.facebookUrl), 'Facebook', Users],
    [safeExternalHref(lawyer.instagramUrl), 'Instagram', Camera],
    [safeExternalHref(lawyer.linkedInUrl), 'LinkedIn', BriefcaseBusiness],
    [safeExternalHref(lawyer.websiteUrl), 'Website', Globe2],
  ] as const;
  const about = lawyer.bio || lawyer.shortBio;

  return (
    <div
      id="consult-lawyer-profile"
      role="region"
      aria-labelledby="lawyer-profile-title"
      className="overflow-hidden rounded-2xl border border-accent/40 bg-surface shadow-lg"
    >
      <div className="flex justify-end p-3 pb-0">
        <button type="button" onClick={onClose} aria-label="Close lawyer profile" className="rounded-full p-2 text-text-muted hover:bg-surface-alt hover:text-text-primary"><X className="h-5 w-5" aria-hidden="true" /></button>
      </div>
      <div className="grid gap-6 px-5 pb-2 pt-1 sm:grid-cols-[240px_1fr] sm:p-6 md:grid-cols-[260px_1fr]">
        {/* LEFT/TOP: portrait and identity */}
        <div className="space-y-4">
          <div className="relative mx-auto w-full max-w-[240px] aspect-[4/5] overflow-hidden rounded-xl bg-surface-alt ring-1 ring-border sm:mx-0 sm:w-full">
            {lawyer.imageUrl ? (
              <Image src={lawyer.imageUrl} alt={`Photo of ${lawyer.name}`} fill sizes="260px" className="object-cover" />
            ) : (
              <div aria-hidden="true" className="flex h-full items-center justify-center text-6xl font-black text-accent">{lawyer.name.charAt(0).toUpperCase()}</div>
            )}
          </div>
          <div className="space-y-1 text-center sm:text-left">
            <h3 ref={headingRef} tabIndex={-1} id="lawyer-profile-title" className="text-xl font-black text-navy dark:text-white focus:outline-none">{lawyer.name}</h3>
            <p className="text-sm font-semibold text-accent">{lawyer.title || 'Advocate'}{lawyer.licenseNumber ? ` · ${lawyer.licenseNumber}` : ''}</p>
            {lawyer.lawFirm && <p className="text-sm text-text-secondary">{lawyer.lawFirm}</p>}
            <nav aria-label={`${lawyer.name} contact options`} className="flex flex-wrap justify-center gap-2 pt-1 sm:justify-start">
              {call && <a href={call} className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-2 text-xs font-bold text-text-primary hover:border-accent"><Phone className="h-3.5 w-3.5" aria-hidden="true" />Direct Call</a>}
              {whatsapp && <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700"><MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />WhatsApp</a>}
              {lawyer.email && <a href={`mailto:${lawyer.email}`} className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-2 text-xs font-bold text-text-primary hover:border-accent"><Mail className="h-3.5 w-3.5" aria-hidden="true" />Email</a>}
              {mapHref && <a href={mapHref} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-2 text-xs font-bold text-text-primary hover:border-accent"><MapPin className="h-3.5 w-3.5" aria-hidden="true" />Visit Office</a>}
            </nav>
          </div>
        </div>

        {/* MAIN PROFILE: biography and credentials */}
        <div className="min-w-0 space-y-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-accent">Lawyer profile</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {(lawyer.practiceAreas || lawyer.specialization || '').split(/[,\n]/).map((value) => value.trim()).filter(Boolean).map((area) => (
                <span key={area} className="rounded-full border border-border bg-surface-alt px-2.5 py-1 text-xs text-text-secondary">{area}</span>
              ))}
            </div>
          </div>

          {about && (
            <div>
              <p className="mb-1 text-xs font-bold uppercase tracking-wide text-text-muted">About</p>
              <p className="whitespace-pre-wrap leading-relaxed text-text-secondary">{about}</p>
            </div>
          )}

          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            {lawyer.specialization && <DetailItem icon={Scale} title="Specialization" text={lawyer.specialization} />}
            {lawyer.practiceAreas && <DetailItem icon={Scale} title="Practice areas" text={lawyer.practiceAreas} />}
            {cityList(lawyer) && <DetailItem icon={MapPin} title="Service cities" text={cityList(lawyer)} />}
            {lawyer.lawFirm && <DetailItem icon={BriefcaseBusiness} title="Law firm" text={lawyer.lawFirm} />}
            {lawyer.qualifications && <DetailItem icon={GraduationCap} title="Academic qualifications" text={lawyer.qualifications} />}
            {lawyer.achievements && <DetailItem icon={Award} title="Achievements" text={lawyer.achievements} />}
            {lawyer.experience && <DetailItem icon={ShieldCheck} title="Experience" text={lawyer.experience} />}
            {lawyer.officeAddress && <DetailItem icon={Building2} title="Office address" text={lawyer.officeAddress} />}
            {lawyer.phone && <DetailItem icon={Phone} title="Phone" text={lawyer.phone} />}
            {lawyer.email && <div className="flex items-start gap-2.5"><Mail className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" /><div><p className="text-xs font-bold uppercase tracking-wide text-text-muted">Email</p><a href={`mailto:${lawyer.email}`} className="break-all font-medium text-accent underline underline-offset-2">{lawyer.email}</a></div></div>}
          </dl>

          {socialLinks.some(([href]) => href) && (
            <nav aria-label="Lawyer social profiles" className="flex flex-wrap gap-2">
              {socialLinks.map(([href, label, Icon]) => href ? (
                <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={`${lawyer.name} on ${label}`} className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-semibold text-text-secondary hover:border-accent hover:text-accent">
                  <Icon className="h-4 w-4" aria-hidden="true" />{label}
                </a>
              ) : null)}
            </nav>
          )}

          {/* Prominent booking CTA for this specific advocate */}
          <div className="flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-text-muted">Requests are reviewed confidentially by the consultation team.</p>
            <button
              type="button"
              onClick={onBook}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-accent px-6 py-3.5 text-sm font-extrabold text-white transition-colors hover:bg-accent-hover"
            >
              <Scale className="h-4 w-4" aria-hidden="true" /> Book a Consultation
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailItem({ icon: Icon, title, text }: { icon: typeof Scale; title: string; text: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
      <div>
        <dt className="text-xs font-bold uppercase tracking-wide text-text-muted">{title}</dt>
        <dd className="whitespace-pre-wrap font-medium text-text-primary">{text}</dd>
      </div>
    </div>
  );
}
