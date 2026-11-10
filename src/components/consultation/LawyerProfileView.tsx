import Image from 'next/image';
import Link from 'next/link';
import {
  Award, BriefcaseBusiness, ChevronLeft,
  GraduationCap, Mail, MapPin, MessageCircle, Phone, Scale,
  ShieldCheck, Globe2,
} from 'lucide-react';
import type { ConsultationLawyer } from './ConsultationForm';

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
    </svg>
  );
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" clipRule="evenodd" />
    </svg>
  );
}

function LinkedinIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

interface LawyerProfileViewProps {
  lawyer: ConsultationLawyer;
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

export default function LawyerProfileView({ lawyer }: LawyerProfileViewProps) {
  const call = phoneHref(lawyer.phone);
  const whatsapp = whatsappHref(lawyer.whatsappNumber || lawyer.phone, lawyer.name);
  const mapHref = safeExternalHref(lawyer.officeMapUrl) || (
    lawyer.officeAddress || lawyer.location
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lawyer.officeAddress || lawyer.location || '')}`
      : undefined
  );

  const socialLinks = [
    [safeExternalHref(lawyer.facebookUrl), 'Facebook', FacebookIcon, 'text-[#1877f2]'],
    [safeExternalHref(lawyer.instagramUrl), 'Instagram', InstagramIcon, 'text-[#e1306c]'],
    [safeExternalHref(lawyer.linkedInUrl), 'LinkedIn', LinkedinIcon, 'text-[#0a66c2]'],
    [safeExternalHref(lawyer.websiteUrl), 'Website', Globe2, 'text-accent'],
  ] as const;

  const about = lawyer.bio || lawyer.shortBio;
  const specializationList = (lawyer.specialization || lawyer.practiceAreas || '')
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean);

  return (
    <div id="consult-lawyer-profile" className="space-y-6">
      {/* Back button */}
      <div>
        <Link
          href="/consultation"
          className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2 text-sm font-bold text-text-secondary transition-colors hover:border-accent hover:text-navy dark:hover:text-white"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          Back to all advocates
        </Link>
      </div>

      <div className="overflow-hidden rounded-3xl border border-border bg-surface shadow-xl">
        <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[300px_1fr] lg:gap-10">
          {/* LEFT COLUMN: Image, Identity, Contacts, Social links */}
          <div className="space-y-6">
            <div className="relative mx-auto aspect-[4/5] w-full max-w-[280px] overflow-hidden rounded-2xl bg-surface-alt ring-1 ring-border sm:mx-0 sm:max-w-none">
              {lawyer.imageUrl ? (
                <Image
                  src={lawyer.imageUrl}
                  alt={`Portrait of ${lawyer.name}`}
                  fill
                  sizes="(max-width: 1024px) 280px, 300px"
                  className="object-cover"
                  priority
                />
              ) : (
                <div aria-hidden="true" className="flex h-full w-full items-center justify-center text-7xl font-black text-accent">
                  {lawyer.name.charAt(0).toUpperCase()}
                </div>
              )}
              {lawyer.isFeatured && (
                <span className="absolute right-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-bold uppercase tracking-wider text-accent shadow-sm backdrop-blur dark:bg-zinc-900/90">
                  Featured
                </span>
              )}
            </div>

            <div className="space-y-1 text-center sm:text-left">
              <h1 id="lawyer-profile-title" className="text-2xl font-black text-navy dark:text-white sm:text-3xl">
                {lawyer.name}
              </h1>
              <p className="text-base font-bold text-accent">
                {lawyer.title || 'Advocate'}
                {lawyer.licenseNumber ? ` · ${lawyer.licenseNumber}` : ''}
              </p>
              {lawyer.courtJurisdiction && (
                <p className="text-xs text-text-muted">{lawyer.courtJurisdiction}</p>
              )}
            </div>

            {/* Contacts */}
            {(lawyer.phone || lawyer.email) && (
              <div className="space-y-2 rounded-2xl border border-border bg-surface-alt p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-text-muted">Contacts</p>
                <div className="space-y-2 text-sm">
                  {lawyer.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
                      <a href={`tel:${lawyer.phone.replace(/[^+\d]/g, '')}`} className="font-semibold text-text-primary hover:text-accent">
                        {lawyer.phone}
                      </a>
                    </div>
                  )}
                  {lawyer.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
                      <a href={`mailto:${lawyer.email}`} className="break-all font-semibold text-text-primary hover:text-accent">
                        {lawyer.email}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Direct Connect (Socials) */}
            {socialLinks.some(([href]) => href) && (
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-text-muted">Direct Connect</p>
                <div className="flex flex-wrap gap-2">
                  {socialLinks.map(([href, label, Icon, brandColor]) =>
                    href ? (
                      <a
                        key={label}
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`${lawyer.name} on ${label}`}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-2 text-xs font-semibold text-text-secondary transition-colors hover:border-accent hover:text-text-primary"
                      >
                        <Icon className={`h-3.5 w-3.5 ${brandColor}`} aria-hidden="true" />
                        {label}
                      </a>
                    ) : null
                  )}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: Specialization, Service Cities, Law Firm, Academics, Achievements, Actions */}
          <div className="min-w-0 space-y-6">
            {/* Specialization */}
            {specializationList.length > 0 && (
              <div className="space-y-2">
                <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-accent">
                  <Scale className="h-4 w-4" aria-hidden="true" /> Specialization
                </h2>
                <div className="flex flex-wrap gap-2">
                  {specializationList.map((item) => (
                    <span
                      key={item}
                      className="rounded-xl border border-border bg-surface-alt px-3.5 py-1.5 text-sm font-semibold text-text-primary shadow-sm"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Service Cities */}
            {cityList(lawyer) && (
              <div className="space-y-1">
                <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-text-muted">
                  <MapPin className="h-4 w-4 text-accent" aria-hidden="true" /> Service Cities
                </h2>
                <p className="pl-6 text-base font-medium text-text-primary">{cityList(lawyer)}</p>
              </div>
            )}

            {/* Law Firm & Office */}
            {(lawyer.lawFirm || lawyer.officeAddress) && (
              <div className="space-y-1">
                <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-text-muted">
                  <BriefcaseBusiness className="h-4 w-4 text-accent" aria-hidden="true" /> Law Firm
                </h2>
                <p className="pl-6 text-base font-semibold text-navy dark:text-white">
                  {lawyer.lawFirm || 'Chambers Desk'}
                  {lawyer.officeAddress ? ` · ${lawyer.officeAddress}` : ''}
                </p>
              </div>
            )}

            {/* Academics */}
            {lawyer.qualifications && (
              <div className="space-y-1">
                <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-text-muted">
                  <GraduationCap className="h-4 w-4 text-accent" aria-hidden="true" /> Academics
                </h2>
                <p className="pl-6 whitespace-pre-wrap text-base font-medium text-text-primary">
                  {lawyer.qualifications}
                </p>
              </div>
            )}

            {/* Achievements */}
            {lawyer.achievements && (
              <div className="space-y-1">
                <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-text-muted">
                  <Award className="h-4 w-4 text-accent" aria-hidden="true" /> Achievements
                </h2>
                <p className="pl-6 whitespace-pre-wrap text-base font-medium text-text-primary">
                  {lawyer.achievements}
                </p>
              </div>
            )}

            {/* About / Experience */}
            {about && (
              <div className="space-y-1">
                <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-text-muted">
                  <ShieldCheck className="h-4 w-4 text-accent" aria-hidden="true" /> About & Experience
                </h2>
                <p className="pl-6 whitespace-pre-wrap text-sm leading-relaxed text-text-secondary">
                  {about}
                </p>
              </div>
            )}

            {/* ACTION BUTTONS: 2 up, 2 down grid */}
            <div className="border-t border-border pt-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <Link
                  href={`/consultation/${lawyer.slug}/book`}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-5 py-3.5 text-sm font-extrabold text-white shadow-md transition-colors hover:bg-accent-hover"
                >
                  <Scale className="h-4 w-4" aria-hidden="true" />
                  Book a Consultation
                </Link>

                {call && (
                  <a
                    href={call}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-surface px-4 py-3.5 text-sm font-bold text-text-primary transition-colors hover:border-accent hover:text-accent"
                  >
                    <Phone className="h-4 w-4 text-accent" aria-hidden="true" />
                    Direct Call
                  </a>
                )}

                {whatsapp && (
                  <a
                    href={whatsapp}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-emerald-700"
                  >
                    <MessageCircle className="h-4 w-4" aria-hidden="true" />
                    Contact on WhatsApp
                  </a>
                )}

                {mapHref && (
                  <a
                    href={mapHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-surface px-4 py-3.5 text-sm font-bold text-text-primary transition-colors hover:border-accent hover:text-accent"
                  >
                    <MapPin className="h-4 w-4 text-accent" aria-hidden="true" />
                    Visit Office
                  </a>
                )}
              </div>
              <p className="text-xs text-text-muted">
                Official certified advocate registered with the Nepal Bar Council. Consultations are handled confidentially.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
