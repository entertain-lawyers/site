'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Scale,
  Phone,
  Mail,
  MessageCircle,
  Calendar,
  Building2,
  MapPin,
  Clock,
  ShieldCheck,
  Navigation,
  ExternalLink,
  UserCheck,
  Sparkles,
  ArrowDown,
  ChevronRight,
  Briefcase,
  Award,
  CheckCircle,
} from 'lucide-react';
import ConsultationForm, { ConsultationLawyer } from './ConsultationForm';
import { Reveal } from '@/components/motion/primitives';

const QUICK_CONTACTS = [
  {
    href: 'tel:+9779822010737',
    label: 'Call Chambers Desk (+977 9822010737)',
    icon: Phone,
    className: 'bg-navy text-white hover:bg-navy-light',
  },
  {
    href:
      'https://wa.me/9779822010737?text=' +
      encodeURIComponent('Namaste Entertain Lawyers Chambers, I would like to consult with a certified advocate.'),
    label: 'WhatsApp Chambers',
    icon: MessageCircle,
    className: 'bg-emerald-600 text-white hover:bg-emerald-700',
    external: true,
  },
  {
    href: 'mailto:contact@entertainlawyers.com',
    label: 'contact@entertainlawyers.com',
    icon: Mail,
    className: 'border border-border bg-surface text-text-primary hover:border-accent/40 hover:text-accent',
  },
] as const;

interface ConsultationClientProps {
  lawyers: ConsultationLawyer[];
  loadError?: boolean;
}

export default function ConsultationClient({ lawyers, loadError = false }: ConsultationClientProps) {
  const [selectedLawyer, setSelectedLawyer] = useState<ConsultationLawyer | null>(null);
  const [isFormHighlighted, setIsFormHighlighted] = useState(false);
  const bookingFormRef = useRef<HTMLDivElement>(null);

  const handleSelectLawyerForBooking = (lawyer: ConsultationLawyer) => {
    setSelectedLawyer(lawyer);
    setIsFormHighlighted(true);

    if (bookingFormRef.current) {
      bookingFormRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  useEffect(() => {
    if (isFormHighlighted) {
      const timer = setTimeout(() => {
        setIsFormHighlighted(false);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [isFormHighlighted]);

  return (
    <div className="relative w-full bg-background min-h-screen py-10 sm:py-16">
      {/* Decorative background blurs */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-96 overflow-hidden" aria-hidden="true">
        <div className="absolute left-1/2 -translate-x-1/2 -top-32 w-[42rem] h-[42rem] bg-accent/8 rounded-full blur-3xl" />
        <div className="absolute left-[10%] top-12 w-64 h-64 bg-gold/10 dark:bg-gold/5 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12 sm:space-y-16">
        {/* Hero Section */}
        <div className="space-y-5 max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-accent/10 text-accent text-xs font-extrabold shadow-xs">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Nepal Bar Council Licensed Advocates • Pokhara &amp; Kathmandu</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-navy dark:text-white tracking-tight leading-[1.1]">
            Consult Our Certified{' '}
            <span className="bg-gradient-to-r from-accent via-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Advocates
            </span>
          </h1>

          <p className="text-text-secondary text-base sm:text-lg leading-relaxed max-w-2xl mx-auto">
            Review certified legal counsel profiles, Bar Council credentials, court admissions, and practice areas. Contact an advocate directly or schedule an in-person or online consultation.
          </p>
          <p className="text-xs sm:text-sm text-text-muted font-medium -mt-2">
            प्रमाणित कानुन व्यवसायीहरूको विवरण हेरी सिधै फोन/ह्वाट्सएप मार्फत सम्पर्क गर्नुहोस् वा परामर्श समय बुक गर्नुहोस्।
          </p>

          {/* Quick contact buttons */}
          <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
            {QUICK_CONTACTS.map((qc) => (
              <a
                key={qc.label}
                href={qc.href}
                {...('external' in qc && qc.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full text-xs sm:text-sm font-bold shadow-xs active:scale-[0.98] transition-all ${qc.className}`}
              >
                <qc.icon className="w-4 h-4" />
                <span>{qc.label}</span>
              </a>
            ))}
          </div>
        </div>

        {/* Section 1: Certified Lawyer Profiles */}
        <section aria-labelledby="lawyers-heading" className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-border pb-4">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-accent mb-1">
                <Scale className="w-3.5 h-3.5" />
                <span>Certified Bar Advocates</span>
              </div>
              <h2 id="lawyers-heading" className="text-2xl sm:text-3xl font-extrabold text-navy dark:text-white tracking-tight">
                Our Legal Counsel &amp; Advocates
              </h2>
              <p className="text-text-secondary text-xs sm:text-sm mt-1">
                Licensed legal practitioners certified by the Nepal Bar Council with court admissions across Nepal.
              </p>
            </div>

            <a
              href="#booking-form"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-accent hover:underline self-start sm:self-auto"
            >
              <span>Jump to Intake Form</span>
              <ArrowDown className="w-3.5 h-3.5" />
            </a>
          </div>

          {loadError ? (
            <div role="alert" className="text-center py-12 bg-surface rounded-2xl border border-red-200 dark:border-red-900/50">
              <p className="text-red-700 dark:text-red-300 font-bold text-sm">The lawyer directory is temporarily unavailable.</p>
              <p className="text-text-secondary text-sm mt-1">
                You can still submit a consultation request below, or call{' '}
                <a href="tel:+9779822010737" className="font-bold underline underline-offset-4">+977 9822010737</a>.
              </p>
            </div>
          ) : lawyers.length === 0 ? (
            <div className="text-center py-12 bg-surface rounded-2xl border border-border">
              <p className="text-text-secondary text-sm">No lawyer profiles are published yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {lawyers.map((lawyer, i) => {
                const phone = lawyer.phone || '+9779822010737';
                const phoneHref = `tel:${phone.replace(/[^\d+]/g, '')}`;
                const email = lawyer.email || 'contact@entertainlawyers.com';
                const rawDigits = (lawyer.whatsappNumber || lawyer.phone || '9822010737').replace(/[^0-9]/g, '');
                const whatsappNumber = rawDigits.startsWith('977') ? rawDigits : `977${rawDigits.replace(/^0+/, '')}`;
                const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
                  `Namaste Advocate ${lawyer.name}, I would like to consult with you regarding a legal matter via Entertain Lawyers.`
                )}`;
                const isSelected = selectedLawyer?.id === lawyer.id;

                return (
                  <Reveal index={i} perRow={3} lift
                    key={lawyer.id}
                    className={`group relative bg-surface border rounded-3xl shadow-sm overflow-hidden flex flex-col h-full transition-[box-shadow,border-color,background-color] duration-300 hover:shadow-xl dark:hover:shadow-black/50 ${
                      isSelected
                        ? 'border-accent ring-2 ring-accent ring-offset-2 ring-offset-background'
                        : 'border-border'
                    }`}
                  >
                    {/* Top Status Header */}
                    {isSelected && (
                      <div className="bg-accent text-white text-[11px] font-black uppercase tracking-wider py-1.5 px-3 text-center flex items-center justify-center gap-1.5">
                        <UserCheck className="w-4 h-4" />
                        <span>Selected for Consultation</span>
                      </div>
                    )}

                    {/* Card Body */}
                    <div className="p-6 flex-1 flex flex-col space-y-4">
                      {/* Photo & Identity row */}
                      <div className="flex items-start gap-4">
                        <div className="relative w-20 h-24 rounded-2xl overflow-hidden bg-slate-100 dark:bg-zinc-800 shrink-0 ring-1 ring-border shadow-xs">
                          {lawyer.imageUrl ? (
                            <Image
                              src={lawyer.imageUrl}
                              alt={lawyer.name}
                              fill
                              className="object-cover group-hover:scale-105 transition-transform duration-500"
                              sizes="96px"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-3xl font-black text-text-muted bg-surface-alt">
                              {lawyer.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 flex-1 space-y-1">
                          {lawyer.isFeatured && (
                            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 tracking-wider">
                              Lead Advocate
                            </span>
                          )}

                          <h3 className="text-lg font-black text-navy dark:text-white leading-tight truncate">
                            Advocate {lawyer.name}
                          </h3>

                          <p className="text-xs font-bold text-accent">
                            {lawyer.title || lawyer.designation || 'Advocate'}
                          </p>

                          {lawyer.licenseNumber && (
                            <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                              <span className="truncate">{lawyer.licenseNumber}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Credentials & Court Jurisdictions */}
                      <div className="space-y-2 pt-2 border-t border-border text-xs">
                        {lawyer.courtJurisdiction && (
                          <div className="flex items-start gap-2 text-text-secondary">
                            <Scale className="w-3.5 h-3.5 text-accent shrink-0 mt-0.5" />
                            <span className="leading-snug font-medium">{lawyer.courtJurisdiction}</span>
                          </div>
                        )}

                        {lawyer.experience && (
                          <div className="flex items-center gap-2 text-text-muted">
                            <Award className="w-3.5 h-3.5 text-accent shrink-0" />
                            <span>{lawyer.experience}</span>
                            {lawyer.qualifications && <span>• {lawyer.qualifications}</span>}
                          </div>
                        )}
                      </div>

                      {/* Specialization & Practice Areas */}
                      {(lawyer.specialization || lawyer.practiceAreas) && (
                        <div className="space-y-1.5 pt-1">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-text-muted block">
                            Specialized Practice:
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {(lawyer.practiceAreas || lawyer.specialization || '')
                              .split(/[,\n]/)
                              .map((area, idx) => {
                                const trimmed = area.trim();
                                if (!trimmed) return null;
                                return (
                                  <span
                                    key={idx}
                                    className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-surface-alt text-text-primary border border-border"
                                  >
                                    {trimmed}
                                  </span>
                                );
                              })}
                          </div>
                        </div>
                      )}

                      {/* Short Bio */}
                      {lawyer.shortBio && (
                        <p className="text-text-secondary text-xs line-clamp-3 leading-relaxed pt-1">
                          {lawyer.shortBio}
                        </p>
                      )}

                      {/* Direct Channels Bar: Call, WhatsApp, Email */}
                      <div className="mt-auto pt-3 border-t border-border space-y-2.5">
                        <div className="grid grid-cols-3 gap-2">
                          <a
                            href={phoneHref}
                            title={`Call Advocate ${lawyer.name}`}
                            className="flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-bold bg-surface-alt hover:bg-navy hover:text-white dark:hover:bg-accent border border-border transition-all text-text-primary shadow-2xs"
                          >
                            <Phone className="w-3.5 h-3.5 text-accent" />
                            <span>Call</span>
                          </a>

                          <a
                            href={whatsappUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={`WhatsApp Message Advocate ${lawyer.name}`}
                            className="flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-600 dark:hover:text-white border border-emerald-200 dark:border-emerald-800 transition-all shadow-2xs"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            <span>WhatsApp</span>
                          </a>

                          <a
                            href={`mailto:${email}?subject=${encodeURIComponent(
                              `Legal Consultation Inquiry for Advocate ${lawyer.name}`
                            )}`}
                            title={`Email Advocate ${lawyer.name}`}
                            className="flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-bold bg-surface-alt hover:bg-accent hover:text-white border border-border transition-all text-text-primary shadow-2xs"
                          >
                            <Mail className="w-3.5 h-3.5 text-accent" />
                            <span>Email</span>
                          </a>
                        </div>

                        {/* Booking Action */}
                        <button
                          type="button"
                          onClick={() => handleSelectLawyerForBooking(lawyer)}
                          className={`w-full py-3 px-4 rounded-xl text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 transition-all shadow-sm ${
                            isSelected
                              ? 'bg-accent text-white ring-2 ring-accent ring-offset-2 ring-offset-background'
                              : 'bg-navy text-white hover:bg-navy-light dark:bg-accent dark:hover:bg-accent-hover'
                          }`}
                        >
                          <Calendar className="w-4 h-4" />
                          <span>
                            {isSelected
                              ? `Selected: Advocate ${lawyer.name}`
                              : `Book Consultation with Advocate ${lawyer.name.split(' ')[0]}`}
                          </span>
                        </button>
                      </div>
                    </div>
                  </Reveal>
                );
              })}
            </div>
          )}
        </section>

        {/* Section 2: Consultation Booking Form & Chambers Info */}
        <section id="booking-form" ref={bookingFormRef} className="pt-8 space-y-6 scroll-mt-20">
          <div className="max-w-2xl mx-auto text-center space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/10 text-accent text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Chambers Registry &amp; Intake</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-navy dark:text-white tracking-tight">
              Schedule Your Legal Consultation
            </h2>
            <p className="text-text-secondary text-sm">
              {selectedLawyer
                ? `Booking designated with Advocate ${selectedLawyer.name} (${selectedLawyer.licenseNumber || 'Nepal Bar Council'}). Fill in your details below to schedule your appointment.`
                : 'Fill in your matter details below. Our senior advocates will review your submission and contact you within 1 business day.'}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Primary Action — Booking Form */}
            <div className="lg:col-span-7 order-1 lg:order-2">
              <ConsultationForm
                lawyers={lawyers}
                selectedLawyer={selectedLawyer}
                onSelectLawyer={(lawyer) => setSelectedLawyer(lawyer)}
                isHighlighted={isFormHighlighted}
              />
            </div>

            {/* Sidebar — Chambers Location, Contacts & Ethics */}
            <aside className="lg:col-span-5 order-2 lg:order-1 lg:sticky lg:top-24 space-y-6">
              <div className="bg-surface rounded-3xl border border-border shadow-sm overflow-hidden">
                {/* Location Map */}
                <iframe
                  title="Entertain Lawyers — Office Location Map"
                  src="https://www.google.com/maps?q=Prithvi%20Narayan%20Campus%2C%20Pokhara%2C%20Kaski%2C%20Nepal&output=embed"
                  className="w-full h-44 sm:h-52 border-0"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />

                <div className="p-5 sm:p-6 space-y-5">
                  <h3 className="text-sm font-black text-navy dark:text-white uppercase tracking-wider flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-accent" />
                    <span>Law Chambers Desk</span>
                  </h3>

                  <ul className="space-y-3.5 text-sm text-text-secondary">
                    <li className="flex items-start gap-3">
                      <MapPin className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                      <span className="leading-snug">
                        Prithvi Narayan Law Campus, Pokhara — Kaski, Gandaki Province, Nepal
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Phone className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                      <a href="tel:+9779822010737" className="font-semibold underline underline-offset-4 hover:text-accent">
                        +977 9822010737
                      </a>
                    </li>
                    <li className="flex items-start gap-3">
                      <Mail className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                      <a
                        href="mailto:contact@entertainlawyers.com"
                        className="font-semibold underline underline-offset-4 hover:text-accent break-all"
                      >
                        contact@entertainlawyers.com
                      </a>
                    </li>
                    <li className="flex items-start gap-3">
                      <Clock className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                      <span className="leading-snug">
                        Sunday – Friday: 10:00 AM – 5:00 PM{' '}
                        <span className="text-text-muted">(Closed Saturdays &amp; Court Holidays)</span>
                      </span>
                    </li>
                  </ul>

                  <div className="flex items-center justify-between gap-3 pt-2 border-t border-border">
                    <p className="text-[11px] text-text-muted flex items-start gap-1.5 leading-relaxed min-w-0">
                      <ShieldCheck className="w-3.5 h-3.5 text-accent shrink-0 mt-0.5" />
                      Strictly confidential — protected by legal privilege under Nepal Bar Council ethics.
                    </p>
                    <a
                      href="https://www.google.com/maps/search/?api=1&query=Prithvi+Narayan+Campus,+Pokhara,+Kaski,+Nepal"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-accent/10 text-xs font-bold text-accent hover:bg-accent hover:text-white transition-colors"
                    >
                      <Navigation className="w-3 h-3" />
                      <span>Directions</span>
                    </a>
                  </div>
                </div>
              </div>

              {/* Court Fee Calculator Card */}
              <div className="bg-gradient-to-br from-navy to-navy-dark text-white p-6 rounded-3xl shadow-sm space-y-3">
                <div className="inline-flex items-center gap-2 text-gold text-xs font-bold uppercase tracking-wider">
                  <Scale className="w-4 h-4" />
                  <span>Interactive Legal Tool</span>
                </div>
                <h4 className="text-lg font-bold">Court Fee Calculator</h4>
                <p className="text-slate-300 text-xs leading-relaxed">
                  Estimate statutory court filing fees for civil claims, property partition, and monetary disputes according to the National Civil Procedure Code 2074.
                </p>
                <Link
                  href="/calculator"
                  className="inline-flex items-center gap-2 text-xs font-bold text-white bg-accent hover:bg-accent-hover px-4 py-2.5 rounded-full transition-colors"
                >
                  <span>Open Court Fee Calculator</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </aside>
          </div>
        </section>
      </div>
    </div>
  );
}
