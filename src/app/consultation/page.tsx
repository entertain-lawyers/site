import { Metadata } from 'next';
import { Suspense } from 'react';
import Link from 'next/link';
import ConsultationForm from '@/components/consultation/ConsultationForm';
import {
  Scale,
  MapPin,
  Phone,
  Mail,
  Clock,
  Calculator,
  Users,
  Building2,
  ClipboardList,
  SearchCheck,
  MessagesSquare,
  Gavel,
  Landmark,
  Copyright,
  ScrollText,
  HeartHandshake,
  MessageCircle,
  ShieldCheck,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Consult a Lawyer | Legal Consultation in Nepal | Entertain Lawyers',
  description: 'Book a professional legal consultation with our advocates in Pokhara & Kathmandu. Expert legal advisory in Civil, Criminal, Corporate, IP, and Family Law.',
  keywords: [
    'Consult a lawyer Nepal',
    'legal consultation pokhara',
    'nepal advocate consultation',
    'hire lawyer in kathmandu nepal',
    'entertain lawyers consultation',
  ],
};

const PROCESS_STEPS = [
  {
    number: '01',
    icon: ClipboardList,
    title: 'Share Your Case (आफ्नो मुद्दा पठाउनुहोस्)',
    description: 'Fill in the request form with a short description of your matter. Your details stay confidential and go directly to our chambers — not to any third party.',
  },
  {
    number: '02',
    icon: SearchCheck,
    title: 'Case Review & Matching (अध्ययन तथा मिलान)',
    description: 'Our team reviews your matter, verifies the proper court jurisdiction, and matches you with the advocate best suited to the area of law involved.',
  },
  {
    number: '03',
    icon: MessagesSquare,
    title: 'Consultation & Roadmap (परामर्श तथा कानूनी बाटो',
    description: 'Meet in person at our chambers or online. You receive a clear assessment of your position and the next legal steps — including estimated filing fees where applicable.',
  },
];

const PRACTICE_AREAS = [
  { icon: Scale, label: 'Civil & Commercial Law', nepali: 'दीवानी तथा वाणिज्य कानून' },
  { icon: Gavel, label: 'Criminal Law & Evidence', nepali: 'फौजदारी कानून तथा प्रमाण' },
  { icon: Landmark, label: 'Constitutional & Public Law', nepali: 'संवैधानिक तथा सार्वजनिक कानून' },
  { icon: Building2, label: 'Corporate & Business Advisory', nepali: 'कर्पोरेट तथा व्यावसायिक परामर्श' },
  { icon: Copyright, label: 'Intellectual Property & Media', nepali: 'बौद्धिक सम्पत्ति कानून' },
  { icon: HeartHandshake, label: 'Family & Property Law', nepali: 'पारिवारिक तथा अंशबण्डा कानून' },
  { icon: ScrollText, label: 'Legal Drafting & Court Filing', nepali: 'कानूनी मस्यौदा तथा निवेदन' },
  { icon: MessageCircle, label: 'General Legal Consultation', nepali: 'अन्य कानूनी परामर्श' },
];

export default function ConsultationPage() {
  return (
    <div className="w-full bg-background min-h-screen py-10 sm:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12 sm:space-y-16">

        {/* Hero Header */}
        <div className="space-y-4 max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 text-accent text-xs font-bold">
            <Scale className="w-4 h-4" />
            <span>Professional Legal Counsel</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-navy dark:text-white tracking-tight">
            Consult Our Legal Advocates
          </h1>
          <p className="text-text-secondary text-base sm:text-lg leading-relaxed">
            Schedule an in-person or virtual consultation with our experienced legal team. We evaluate your situation, verify court jurisdiction, and provide clear legal roadmaps.
          </p>
        </div>

        {/* How a Consultation Works */}
        <section className="max-w-5xl mx-auto space-y-6" aria-labelledby="how-it-works">
          <div className="text-center space-y-1">
            <h2 id="how-it-works" className="text-xl sm:text-2xl font-black text-navy dark:text-white tracking-tight">
              How a Consultation Works
            </h2>
            <p className="text-sm text-text-muted font-semibold">परामर्श कसरी काम गर्छ — तीन सरल चरण</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            {PROCESS_STEPS.map((step) => (
              <div
                key={step.number}
                className="bg-surface rounded-3xl border border-border shadow-sm p-6 flex flex-col gap-3 relative overflow-hidden"
              >
                <span className="absolute top-4 right-5 text-3xl font-black text-accent/10 select-none" aria-hidden="true">
                  {step.number}
                </span>
                <div className="w-11 h-11 rounded-2xl bg-accent/10 text-accent flex items-center justify-center shrink-0">
                  <step.icon className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-text-primary leading-snug">{step.title}</h3>
                <p className="text-xs text-text-secondary leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 2-Column Grid: Consultation Form (primary) + Office Info */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Office & Practice Highlights — desktop */}
          <div className="lg:col-span-5 space-y-6 order-2 lg:order-1">
            {/* Office Contact Card */}
            <div className="bg-surface rounded-3xl p-6 sm:p-8 border border-border shadow-md space-y-6">
              <h2 className="text-lg font-black text-navy dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Building2 className="w-5 h-5 text-accent" />
                <span>Law Chambers &amp; Hours</span>
              </h2>

              <ul className="space-y-4 text-sm text-text-secondary">
                <li className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-accent shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-text-primary">Office Location:</strong>
                    <span>Pokhara Metropolitan City-1, Kaski, Gandaki Province, Nepal</span>
                  </div>
                </li>

                <li className="flex items-start gap-3">
                  <Phone className="w-5 h-5 text-accent shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-text-primary">Direct Telephone:</strong>
                    <a href="tel:9822010737" className="hover:text-accent font-semibold underline underline-offset-4">
                      +977 9822010737
                    </a>
                  </div>
                </li>

                <li className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-accent shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-text-primary">Direct Email:</strong>
                    <a href="mailto:contact@entertainlawyers.com" className="hover:text-accent font-semibold underline underline-offset-4">
                      contact@entertainlawyers.com
                    </a>
                  </div>
                </li>

                <li className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-accent shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-text-primary">Chambers Hours:</strong>
                    <span>Sunday – Friday: 10:00 AM – 5:00 PM (Closed Saturdays &amp; Court Holidays)</span>
                  </div>
                </li>
              </ul>

              <p className="text-[11px] text-text-muted flex items-start gap-2 leading-relaxed">
                <ShieldCheck className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                All communications with our advocates are professional and strictly confidential.
              </p>
            </div>

            {/* Quick Cross-link to Court Fee Calculator */}
            <div className="bg-gradient-to-br from-navy to-[#0a182c] text-white rounded-3xl p-6 sm:p-8 shadow-md space-y-4 border border-white/10">
              <div className="flex items-center gap-2 text-xs font-bold text-[#ddba76] uppercase tracking-wider">
                <Calculator className="w-4 h-4" />
                <span>Civil Procedure Utility</span>
              </div>
              <h3 className="text-xl font-bold">
                Estimating Civil Court Filing Fees?
              </h3>
              <p className="text-xs sm:text-sm text-white/80 leading-relaxed">
                Use our automated Nepal Court Fee Calculator to preview progressive filing fees under Section 69 of the Civil Procedure Code before filing your plaint.
              </p>
              <Link
                href="/calculator"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-accent hover:bg-accent-hover text-white text-xs font-bold transition-all shadow-sm"
              >
                <span>Open Court Fee Calculator</span>
              </Link>
            </div>

            {/* Meet Our Advocates Link */}
            <div className="bg-surface rounded-3xl p-6 border border-border flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-accent/10 text-accent">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-text-primary">Explore Our Legal Team</h4>
                  <p className="text-xs text-text-muted">Review counsel qualifications &amp; publications</p>
                </div>
              </div>
              <Link
                href="/team"
                className="px-4 py-2 rounded-full border border-border text-xs font-bold hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              >
                Team
              </Link>
            </div>
          </div>

          {/* Right Column: Consultation Form (7 cols) — primary action, first on mobile */}
          <div className="lg:col-span-7 order-1 lg:order-2">
            <Suspense fallback={
              <div className="bg-surface rounded-3xl border border-border p-12 text-center animate-pulse space-y-4">
                <div className="w-12 h-12 bg-accent/20 rounded-full mx-auto" />
                <div className="h-4 bg-surface-alt rounded w-1/2 mx-auto" />
                <div className="h-3 bg-surface-alt rounded w-3/4 mx-auto" />
              </div>
            }>
              <ConsultationForm />
            </Suspense>
          </div>
        </div>

        {/* Practice Areas */}
        <section className="space-y-6" aria-labelledby="practice-areas">
          <div className="text-center space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 text-accent text-xs font-bold">
              <Scale className="w-4 h-4" />
              <span>Practice Areas</span>
            </div>
            <h2 id="practice-areas" className="text-xl sm:text-2xl font-black text-navy dark:text-white tracking-tight">
              Areas Our Advocates Advise On
            </h2>
            <p className="text-sm text-text-muted font-semibold">हाम्रा वकिलहरूले परामर्श दिने कानूनी क्षेत्रहरू</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {PRACTICE_AREAS.map((area) => (
              <div
                key={area.label}
                className="bg-surface rounded-2xl border border-border p-5 flex items-start gap-3.5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all"
              >
                <div className="p-2.5 rounded-xl bg-accent/10 text-accent shrink-0">
                  <area.icon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-text-primary leading-snug">{area.label}</h3>
                  <p className="text-xs text-text-muted mt-1">{area.nepali}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
