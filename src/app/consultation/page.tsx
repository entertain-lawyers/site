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
  ShieldCheck, 
  Calculator, 
  Users, 
  Building2,
  FileText
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

export default function ConsultationPage() {
  return (
    <div className="w-full bg-background min-h-screen py-10 sm:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
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

        {/* 2-Column Grid: Office Info + Consultation Form */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Office & Practice Highlights (4 cols) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Office Contact Card */}
            <div className="bg-surface rounded-3xl p-6 sm:p-8 border border-border shadow-md space-y-6">
              <h2 className="text-lg font-black text-navy dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Building2 className="w-5 h-5 text-accent" />
                <span>Law Chambers & Hours</span>
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
                    <span>Sunday – Friday: 10:00 AM – 5:00 PM (Closed Saturdays & Court Holidays)</span>
                  </div>
                </li>
              </ul>
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
                  <p className="text-xs text-text-muted">Review counsel qualifications & publications</p>
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

          {/* Right Column: Consultation Form (7 cols) */}
          <div className="lg:col-span-7">
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
