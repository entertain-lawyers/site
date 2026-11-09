'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { AlertCircle, CheckCircle2, ChevronDown, Phone, Send, ShieldCheck } from 'lucide-react';
import { submitConsultationRequestAction } from '@/modules/consultation/consultation.actions';
import { PRACTICE_AREAS } from '@/modules/consultation/practice-areas';

export interface ConsultationLawyer {
  id: string;
  name: string;
  slug: string;
  title?: string;
  licenseNumber?: string | null;
  specialization?: string | null;
  practiceAreas?: string | null;
  courtJurisdiction?: string | null;
  experience?: string | null;
  qualifications?: string | null;
  languages?: string | null;
  phone?: string | null;
  email?: string | null;
  whatsappNumber?: string | null;
  location?: string | null;
  serviceCities?: string | null;
  lawFirm?: string | null;
  officeAddress?: string | null;
  officeMapUrl?: string | null;
  facebookUrl?: string | null;
  instagramUrl?: string | null;
  linkedInUrl?: string | null;
  websiteUrl?: string | null;
  achievements?: string | null;
  shortBio?: string | null;
  bio?: string | null;
  imageUrl?: string | null;
  rating?: number | null;
  displayOrder?: number;
  isAvailable?: boolean;
  isFeatured?: boolean;
}

export interface ConsultationFormProps {
  lawyers?: ConsultationLawyer[];
  selectedLawyer?: ConsultationLawyer | null;
  onSelectLawyer?: (lawyer: ConsultationLawyer | null) => void;
  isHighlighted?: boolean;
}

type IntakeValues = {
  fullName: string;
  phone: string;
  whatsappNumber: string;
  permanentAddress: string;
  temporaryAddress: string;
  email: string;
  preferredContactMethod: 'PHONE' | 'EMAIL' | 'WHATSAPP';
  consultationMode: 'PHYSICAL' | 'ONLINE' | 'EITHER';
  practiceArea: string;
  preferredTime: string;
  subject: string;
  description: string;
};

const inputClass = 'w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25';

export default function ConsultationForm({
  lawyers = [],
  selectedLawyer = null,
  onSelectLawyer,
  isHighlighted = false,
}: ConsultationFormProps = {}) {
  const searchParams = useSearchParams();
  const prefilledClaim = Number(searchParams.get('claimAmount')) || undefined;
  const prefilledFee = Number(searchParams.get('courtFee')) || undefined;
  const referralSource = searchParams.get('source') || searchParams.get('ref') || 'website';
  const [values, setValues] = useState<IntakeValues>({
    fullName: '',
    phone: '',
    whatsappNumber: '',
    permanentAddress: '',
    temporaryAddress: '',
    email: '',
    preferredContactMethod: 'PHONE',
    consultationMode: 'PHYSICAL',
    practiceArea: PRACTICE_AREAS[0]?.value || 'GENERAL',
    preferredTime: '',
    subject: '',
    description: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [reference, setReference] = useState('');

  const update = <K extends keyof IntakeValues>(key: K, value: IntakeValues[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
  };

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const result = await submitConsultationRequestAction({
        ...values,
        claimAmount: prefilledClaim,
        courtFeeEstimated: prefilledFee,
        referralSource,
        lawyerId: selectedLawyer?.id || null,
        lawyerName: selectedLawyer?.name || null,
      });
      if (!result.success) {
        setError(result.error || 'Please review the required fields and try again.');
      } else {
        setReference(result.data.id);
      }
    } catch {
      setError('Your request could not be sent right now. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (reference) {
    return (
      <section role="status" className="space-y-5 rounded-3xl border border-emerald-500/30 bg-surface p-6 text-center shadow-lg sm:p-9">
        <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" aria-hidden="true" />
        <div><h3 className="text-2xl font-black text-navy dark:text-white">Request received</h3><p className="mt-2 text-sm text-text-secondary">Thank you, {values.fullName}. Our team will review your request and contact you by phone or WhatsApp.</p></div>
        <p className="rounded-xl bg-surface-alt p-3 font-mono text-sm text-accent">Reference: {reference}</p>
        <button type="button" onClick={() => { setReference(''); setValues((current) => ({ ...current, fullName: '', phone: '', whatsappNumber: '', permanentAddress: '', temporaryAddress: '', email: '', subject: '', description: '' })); onSelectLawyer?.(null); }} className="rounded-xl border border-border px-4 py-2 text-sm font-bold text-text-primary hover:border-accent">Submit another request</button>
      </section>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={`space-y-6 rounded-3xl border bg-surface p-5 shadow-lg transition-shadow sm:p-8 ${isHighlighted ? 'border-accent ring-4 ring-accent/20' : 'border-border'}`}>
      <header className="space-y-1">
        <h3 className="text-xl font-extrabold text-navy dark:text-white sm:text-2xl">Book a Consultation</h3>
        <p className="text-sm text-text-secondary">Tell us how to reach you and briefly explain the legal matter.</p>
      </header>

      {selectedLawyer && <div className="flex items-center justify-between gap-3 rounded-xl border border-accent/20 bg-accent/5 p-3 text-sm"><p className="min-w-0 text-text-primary"><span className="font-bold">Selected advocate:</span> {selectedLawyer.name} <span className="text-text-muted">({selectedLawyer.title || 'Advocate'})</span></p><button type="button" onClick={() => onSelectLawyer?.(null)} className="shrink-0 text-xs font-bold text-accent underline">Clear</button></div>}

      {error && <p role="alert" className="flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />{error}</p>}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name" required><input className={inputClass} autoComplete="name" maxLength={100} required value={values.fullName} onChange={(e) => update('fullName', e.target.value)} placeholder="Your full name" /></Field>
        <Field label="Phone number" required><input className={inputClass} type="tel" inputMode="tel" autoComplete="tel" pattern="[+0-9().\\s-]{7,25}" title="Enter 7 to 25 digits, with optional +, spaces, or punctuation" required value={values.phone} onChange={(e) => update('phone', e.target.value)} placeholder="+977 98XXXXXXXX" /></Field>
        <Field label="WhatsApp number" required><input className={inputClass} type="tel" inputMode="tel" pattern="[+0-9().\\s-]{7,25}" title="Enter 7 to 25 digits, with optional +, spaces, or punctuation" required value={values.whatsappNumber} onChange={(e) => update('whatsappNumber', e.target.value)} placeholder="+977 98XXXXXXXX" /></Field>
        <Field label="Email address (optional)"><input className={inputClass} type="email" autoComplete="email" maxLength={254} value={values.email} onChange={(e) => update('email', e.target.value)} placeholder="you@example.com" /></Field>
        <Field label="Permanent address" required><input className={inputClass} autoComplete="street-address" maxLength={300} required minLength={3} value={values.permanentAddress} onChange={(e) => update('permanentAddress', e.target.value)} placeholder="District, city or municipality" /></Field>
        <Field label="Temporary address" required><input className={inputClass} maxLength={300} required minLength={3} value={values.temporaryAddress} onChange={(e) => update('temporaryAddress', e.target.value)} placeholder="Where you currently stay" /></Field>
      </div>

      <Field label="Explain your legal problem" hint="English, Nepali, or a mix of both is welcome." required>
        <textarea className={`${inputClass} min-h-44 resize-y leading-relaxed`} required minLength={10} maxLength={5000} value={values.description} onChange={(e) => update('description', e.target.value)} placeholder="Write your legal problem here... / आफ्नो कानुनी समस्या यहाँ लेख्नुहोस्..." lang="mul" dir="auto" />
      </Field>

      <details className="group rounded-xl border border-border bg-surface-alt">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 text-sm font-bold text-text-primary"><span>Consultation preferences (optional)</span><ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" aria-hidden="true" /></summary>
        <div className="grid gap-4 border-t border-border p-4 sm:grid-cols-2">
          {lawyers.length > 0 && <Field label="Preferred advocate"><select className={inputClass} value={selectedLawyer?.id || ''} onChange={(e) => onSelectLawyer?.(lawyers.find((lawyer) => lawyer.id === e.target.value) || null)}><option value="">General chambers assignment</option>{lawyers.map((lawyer) => <option key={lawyer.id} value={lawyer.id}>{lawyer.name} — {lawyer.title || 'Advocate'}</option>)}</select></Field>}
          <Field label="Practice area"><select className={inputClass} value={values.practiceArea} onChange={(e) => update('practiceArea', e.target.value)}>{PRACTICE_AREAS.map((area) => <option key={area.value} value={area.value}>{area.label}</option>)}</select></Field>
          <Field label="Preferred contact method"><select className={inputClass} value={values.preferredContactMethod} onChange={(e) => update('preferredContactMethod', e.target.value as IntakeValues['preferredContactMethod'])}><option value="PHONE">Phone</option><option value="WHATSAPP">WhatsApp</option><option value="EMAIL" disabled={!values.email}>Email (add email above)</option></select></Field>
          <Field label="Consultation mode"><select className={inputClass} value={values.consultationMode} onChange={(e) => update('consultationMode', e.target.value as IntakeValues['consultationMode'])}><option value="PHYSICAL">Office visit</option><option value="ONLINE">Online / call</option><option value="EITHER">Either</option></select></Field>
          <Field label="Preferred time"><select className={inputClass} value={values.preferredTime} onChange={(e) => update('preferredTime', e.target.value)}><option value="">Any convenient time</option><option>Morning (10:00 AM - 1:00 PM)</option><option>Afternoon (1:00 PM - 5:00 PM)</option><option>Evening (after 5:00 PM)</option><option>Weekend</option></select></Field>
          <Field label="Short subject (optional)"><input className={inputClass} maxLength={200} value={values.subject} onChange={(e) => update('subject', e.target.value)} placeholder="For example: property partition" /></Field>
        </div>
      </details>

      {prefilledClaim !== undefined && <p className="rounded-xl bg-accent/5 p-3 text-xs text-text-secondary">Calculator details attached: claim रु. {prefilledClaim.toLocaleString('en-IN')}{prefilledFee !== undefined ? ` · estimated fee रु. ${prefilledFee.toLocaleString('en-IN')}` : ''}</p>}

      <p className="flex items-start gap-2 rounded-xl bg-surface-alt p-3 text-xs leading-relaxed text-text-secondary"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />Your information is sent securely to the consultation team for follow-up. Please do not include passwords or financial account credentials.</p>

      <button type="submit" disabled={submitting} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-5 py-3.5 text-base font-extrabold text-white transition-colors hover:bg-accent-hover disabled:cursor-wait disabled:opacity-60">
        {submitting ? <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true" /> : <Send className="h-5 w-5" aria-hidden="true" />}
        {submitting ? 'Submitting…' : 'Submit'}
      </button>
      <p className="text-center text-xs text-text-muted"><Phone className="mr-1 inline h-3 w-3" aria-hidden="true" />For urgent contact, call the selected advocate from their profile.</p>
    </form>
  );
}

function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return <label className="block min-w-0 space-y-1.5 text-sm font-semibold text-text-primary"><span>{label}{required && <span aria-hidden="true" className="ml-1 text-red-600">*</span>}</span>{children}{hint && <span className="block text-xs font-normal text-text-muted">{hint}</span>}</label>;
}
