import { Metadata } from 'next';
import { Suspense } from 'react';
import ConsultationForm from '@/components/consultation/ConsultationForm';
import {
  Scale,
  MapPin,
  Phone,
  Mail,
  Clock,
  MessageCircle,
  PhoneCall,
  ShieldCheck,
  Navigation,
  Building2,
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

const QUICK_CONTACTS = [
  {
    href: 'tel:+9779822010737',
    label: 'Call Now',
    icon: Phone,
    className: 'bg-navy text-white hover:bg-navy-light',
  },
  {
    href: 'https://wa.me/9779822010737',
    label: 'WhatsApp',
    icon: MessageCircle,
    className: 'bg-emerald-600 text-white hover:bg-emerald-700',
    external: true,
  },
  {
    href: 'viber://chat?number=%2B9779822010737',
    label: 'Viber',
    icon: PhoneCall,
    className: 'bg-violet-600 text-white hover:bg-violet-700',
  },
  {
    href: 'mailto:contact@entertainlawyers.com',
    label: 'Email',
    icon: Mail,
    className: 'border border-border bg-surface text-text-primary hover:border-accent/40 hover:text-accent',
  },
] as const;

export default function ConsultationPage() {
  return (
    <div className="w-full bg-background min-h-screen py-10 sm:py-14">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 sm:space-y-10">

        {/* Hero — title, one line, direct contact actions */}
        <div className="space-y-4 max-w-2xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 text-accent text-xs font-bold">
            <Scale className="w-4 h-4" />
            <span>Professional Legal Counsel</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-navy dark:text-white tracking-tight">
            Consult Our Legal Advocates
          </h1>
          <p className="text-text-secondary text-sm sm:text-base leading-relaxed">
            In-person or online — tell us your matter and get a clear assessment of your position and the next legal steps.
          </p>

          {/* Quick contact — how Nepali clients reach a chambers */}
          <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
            {QUICK_CONTACTS.map((qc) => (
              <a
                key={qc.label}
                href={qc.href}
                {...('external' in qc && qc.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                className={`inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-full text-xs font-bold shadow-sm transition-colors ${qc.className}`}
              >
                <qc.icon className="w-4 h-4" />
                {qc.label}
              </a>
            ))}
          </div>
        </div>

        {/* Two-column: Form (primary) + compact contact card */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Sidebar — everything to reach the chambers, on one card */}
          <aside className="lg:col-span-5 order-2 lg:order-1">
            <div className="bg-surface rounded-3xl border border-border shadow-sm overflow-hidden">
              {/* Location map */}
              <iframe
                title="Entertain Lawyers — Office Location Map"
                src="https://www.google.com/maps?q=Pokhara%20Metropolitan%20City-1%2C%20Kaski%2C%20Gandaki%20Province%2C%20Nepal&output=embed"
                className="w-full h-44 sm:h-52 border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />

              <div className="p-6 space-y-5">
                <h2 className="text-sm font-black text-navy dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-accent" />
                  <span>Law Chambers</span>
                </h2>

                <ul className="space-y-3.5 text-sm text-text-secondary">
                  <li className="flex items-start gap-3">
                    <MapPin className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                    <span className="leading-snug">Pokhara Metropolitan City-1, Kaski, Gandaki Province</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Phone className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                    <a href="tel:+9779822010737" className="font-semibold underline underline-offset-4 hover:text-accent">
                      +977 9822010737
                    </a>
                  </li>
                  <li className="flex items-start gap-3">
                    <Mail className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                    <a href="mailto:contact@entertainlawyers.com" className="font-semibold underline underline-offset-4 hover:text-accent break-all">
                      contact@entertainlawyers.com
                    </a>
                  </li>
                  <li className="flex items-start gap-3">
                    <Clock className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                    <span className="leading-snug">Sunday – Friday: 10:00 AM – 5:00 PM <span className="text-text-muted">(Closed Saturdays &amp; Court Holidays)</span></span>
                  </li>
                </ul>

                <div className="flex items-center justify-between gap-3 pt-1">
                  <p className="text-[11px] text-text-muted flex items-start gap-1.5 leading-relaxed min-w-0">
                    <ShieldCheck className="w-3.5 h-3.5 text-accent shrink-0 mt-0.5" />
                    Strictly confidential — handled only by our authorized advocates.
                  </p>
                  <a
                    href="https://www.google.com/maps/search/?api=1&query=Pokhara+Metropolitan+City-1,+Kaski,+Gandaki+Province,+Nepal"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-border text-[11px] font-bold text-text-secondary hover:text-accent hover:border-accent/40 transition-colors"
                  >
                    <Navigation className="w-3 h-3" />
                    Directions
                  </a>
                </div>
              </div>
            </div>
          </aside>

          {/* Primary action — the booking form */}
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
      </div>
    </div>
  );
}
