'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { submitConsultationRequestAction } from '@/modules/consultation/consultation.actions';
import { PRACTICE_AREAS } from '@/modules/consultation/practice-areas';
import {
  Send,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldCheck,
  Phone,
  Mail,
  MessageSquare,
  Building2,
  Video,
  Calculator,
  UserCheck,
  X,
  User,
} from 'lucide-react';

export interface ConsultationLawyer {
  id: string;
  name: string;
  slug: string;
  title?: string;
  designation?: string;
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

export default function ConsultationForm({
  lawyers = [],
  selectedLawyer = null,
  onSelectLawyer,
  isHighlighted = false,
}: ConsultationFormProps = {}) {
  const searchParams = useSearchParams();

  // URL pre-filled parameters if coming from Calculator
  const prefilledClaim = searchParams.get('claimAmount');
  const prefilledFee = searchParams.get('courtFee');
  const prefilledSource = searchParams.get('source') || searchParams.get('ref') || 'website';

  const [formData, setFormData] = useState<{
    fullName: string;
    email: string;
    phone: string;
    preferredContactMethod: 'PHONE' | 'EMAIL' | 'WHATSAPP';
    consultationMode: 'PHYSICAL' | 'ONLINE' | 'EITHER';
    practiceArea: string;
    preferredTime: string;
    claimAmount?: number;
    courtFeeEstimated?: number;
    subject: string;
    description: string;
    referralSource: string;
    lawyerName?: string;
    lawyerId?: string;
  }>({
    fullName: '',
    email: '',
    phone: '',
    preferredContactMethod: 'PHONE',
    consultationMode: 'PHYSICAL',
    practiceArea: PRACTICE_AREAS[0].value,
    preferredTime: 'Morning (10:00 AM - 1:00 PM)',
    claimAmount: prefilledClaim ? Number(prefilledClaim) : undefined,
    courtFeeEstimated: prefilledFee ? Number(prefilledFee) : undefined,
    subject: prefilledClaim ? `Civil Dispute Claim Valuation (Rs. ${Number(prefilledClaim).toLocaleString('en-IN')})` : '',
    description: '',
    referralSource: prefilledSource,
    lawyerName: selectedLawyer?.name || '',
    lawyerId: selectedLawyer?.id || '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<{
    id: string;
    fullName: string;
    lawyerName?: string | null;
  } | null>(null);

  // Sync selected lawyer prop into form state
  useEffect(() => {
    if (selectedLawyer) {
      setFormData((prev) => ({
        ...prev,
        lawyerName: selectedLawyer.name,
        lawyerId: selectedLawyer.id,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        lawyerName: undefined,
        lawyerId: undefined,
      }));
    }
  }, [selectedLawyer]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const activeLawyerName = selectedLawyer?.name || formData.lawyerName || null;
      const activeLawyerId = selectedLawyer?.id || formData.lawyerId || null;

      const res = await submitConsultationRequestAction({
        fullName: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        preferredContactMethod: formData.preferredContactMethod,
        consultationMode: formData.consultationMode,
        practiceArea: formData.practiceArea,
        preferredTime: formData.preferredTime,
        claimAmount: formData.claimAmount,
        courtFeeEstimated: formData.courtFeeEstimated,
        subject: formData.subject,
        description: formData.description,
        referralSource: formData.referralSource,
        lawyerName: activeLawyerName,
        lawyerId: activeLawyerId,
      });

      if (!res.success) {
        setErrorMessage(res.error || 'Failed to submit consultation request. Please check the form.');
      } else {
        setSuccessResult({
          id: res.data.id,
          fullName: res.data.fullName,
          lawyerName: activeLawyerName,
        });
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (successResult) {
    return (
      <div className="bg-surface rounded-3xl border border-emerald-500/30 p-8 sm:p-10 shadow-xl space-y-6 text-center max-w-2xl mx-auto animate-in fade-in zoom-in-95 duration-300">
        <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto border border-emerald-500/20">
          <CheckCircle2 className="w-9 h-9" />
        </div>

        <div className="space-y-2">
          <h3 className="text-2xl font-black text-navy dark:text-white">
            Consultation Request Logged!
          </h3>
          <p className="text-sm text-text-secondary leading-relaxed">
            Thank you, <strong className="text-text-primary">{successResult.fullName}</strong>. Your legal consultation request has been successfully registered with our chambers.
          </p>
        </div>

        <div className="bg-surface-alt rounded-2xl p-5 border border-border text-left space-y-2.5 text-xs sm:text-sm">
          <div className="flex justify-between items-center py-1 border-b border-border">
            <span className="text-text-muted">Case Reference ID:</span>
            <span className="font-mono font-bold text-accent">{successResult.id}</span>
          </div>

          <div className="flex justify-between items-center py-1 border-b border-border">
            <span className="text-text-muted">Designated Advocate / Counsel:</span>
            <span className="font-bold text-navy dark:text-white">
              {successResult.lawyerName ? `Advocate ${successResult.lawyerName}` : 'Chambers Legal Team (General Assignment)'}
            </span>
          </div>

          <div className="flex justify-between items-center py-1 border-b border-border">
            <span className="text-text-muted">Preferred Contact Channel:</span>
            <span className="font-bold text-text-primary">{formData.preferredContactMethod}</span>
          </div>

          <div className="flex justify-between items-center py-1">
            <span className="text-text-muted">Expected Intake Callback:</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">Within 1 Business Day</span>
          </div>
        </div>

        {/* Intake confirmation notice */}
        <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-800 dark:text-blue-300 text-left space-y-1">
          <p className="font-bold">Your request is saved.</p>
          <p>
            Our chambers team will review it and contact you at{' '}
            <strong>{formData.email}</strong>. If you do not hear back within one business day,
            call <strong>+977 9822010737</strong>.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-300 text-left">
          <strong>Attorney-Client Privilege:</strong> All information submitted in this form is strictly confidential and protected under professional legal privilege governed by the Nepal Bar Council Code of Conduct.
        </div>

        <div className="pt-4 flex flex-wrap gap-4 justify-center">
          <button
            type="button"
            onClick={() => {
              setSuccessResult(null);
              onSelectLawyer?.(null);
              setFormData({
                fullName: '',
                email: '',
                phone: '',
                preferredContactMethod: 'PHONE',
                consultationMode: 'PHYSICAL',
                practiceArea: PRACTICE_AREAS[0].value,
                preferredTime: 'Morning (10:00 AM - 1:00 PM)',
                claimAmount: undefined,
                courtFeeEstimated: undefined,
                subject: '',
                description: '',
                referralSource: 'website',
                lawyerName: undefined,
                lawyerId: undefined,
              });
            }}
            className="px-6 py-2.5 rounded-full border border-border bg-surface text-sm font-bold text-text-primary hover:bg-black/5 dark:hover:bg-white/5 transition-all"
          >
            Submit Another Request
          </button>
          <Link
            href="/calculator"
            className="px-6 py-2.5 rounded-full bg-accent text-white text-sm font-bold hover:bg-accent-hover transition-all flex items-center gap-2"
          >
            <Calculator className="w-4 h-4" />
            <span>Court Fee Calculator</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={`bg-surface rounded-3xl border p-6 sm:p-10 shadow-xl space-y-8 transition-all duration-300 ${
        isHighlighted
          ? 'border-accent ring-4 ring-accent/30 shadow-2xl scale-[1.01]'
          : 'border-border'
      }`}
    >
      {/* Header */}
      <div className="space-y-1.5">
        <h2 className="text-xl sm:text-2xl font-black text-navy dark:text-white tracking-tight">
          Book a Legal Consultation
        </h2>
        <p className="text-sm text-text-muted font-semibold">
          परामर्शका लागि आफ्नो विवरण भर्नुहोस् — हामी समय मिलाएर छिट्टै सम्पर्क गर्नेछौँ।
        </p>
      </div>

      {/* Selected Advocate Banner */}
      {selectedLawyer && (
        <div className="p-4 rounded-2xl bg-accent/10 border border-accent/30 flex items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-slate-200 dark:bg-zinc-800 shrink-0 ring-2 ring-accent/30">
              {selectedLawyer.imageUrl ? (
                <Image
                  src={selectedLawyer.imageUrl}
                  alt={selectedLawyer.name}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-bold text-accent text-lg">
                  {selectedLawyer.name.charAt(0)}
                </div>
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-accent text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider">
                <UserCheck className="w-3.5 h-3.5" />
                <span>Selected Advocate</span>
              </div>
              <h4 className="text-sm sm:text-base font-extrabold text-navy dark:text-white truncate">
                Advocate {selectedLawyer.name}
              </h4>
              <p className="text-xs text-text-muted truncate">
                {selectedLawyer.title || selectedLawyer.designation || 'Advocate'}
                {selectedLawyer.licenseNumber ? ` • ${selectedLawyer.licenseNumber}` : ''}
                {selectedLawyer.specialization ? ` (${selectedLawyer.specialization})` : ''}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onSelectLawyer?.(null)}
            className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg bg-surface hover:bg-surface-alt border border-border text-text-secondary hover:text-red-500 transition-colors flex items-center gap-1"
            title="Switch back to General Chambers Intake"
          >
            <X className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Clear</span>
          </button>
        </div>
      )}

      {/* Banner if redirected from Court Fee Calculator */}
      {prefilledClaim && (
        <div className="p-4 rounded-2xl bg-accent/10 border border-accent/20 flex items-start gap-3 text-xs sm:text-sm">
          <Calculator className="w-5 h-5 text-accent shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-bold text-accent">Referred from Court Fee Calculator:</span>
            <p className="text-text-secondary">
              Claim Amount: <strong>रु. {Number(prefilledClaim).toLocaleString('en-IN')}</strong> | Estimated Court Fee: <strong>रु. {Number(prefilledFee || 0).toLocaleString('en-IN')}</strong>. This data will be attached to your intake file.
            </p>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-start gap-3 text-xs sm:text-sm text-red-600 dark:text-red-400">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>{errorMessage}</div>
        </div>
      )}

      {/* Step 1: Advocate Selection */}
      {lawyers && lawyers.length > 0 && (
        <div className="space-y-2">
          <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-accent" />
              <span>1. Select Counsel / Advocate (कानुन व्यवसायी छनोट)</span>
            </span>
            {selectedLawyer && (
              <button
                type="button"
                onClick={() => onSelectLawyer?.(null)}
                className="text-accent hover:underline text-[11px] font-semibold"
              >
                Reset to General Assignment
              </button>
            )}
          </label>
          <select
            value={selectedLawyer?.id || ''}
            onChange={(e) => {
              const val = e.target.value;
              if (!val) {
                onSelectLawyer?.(null);
              } else {
                const match = lawyers.find((l) => l.id === val);
                if (match) onSelectLawyer?.(match);
              }
            }}
            className="w-full px-4 py-3 rounded-xl border border-border bg-background text-text-primary text-sm font-medium focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all"
          >
            <option value="">General Chambers Consultation (Assigned by Senior Counsel)</option>
            {lawyers.map((l) => (
              <option key={l.id} value={l.id}>
                Advocate {l.name} — {l.title || l.designation} {l.licenseNumber ? `(${l.licenseNumber})` : ''}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Step 2: Personal Contact Details */}
      <div className="space-y-4">
        <h3 className="text-base sm:text-lg font-bold text-text-primary border-b border-border pb-2 flex items-center gap-2">
          <span>2. Contact Details (सम्पर्क विवरण)</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5">
              Full Name / पूरा नाम *
            </label>
            <input
              type="text"
              required
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              placeholder="e.g. Ram Bahadur Thapa"
              className="w-full px-4 py-3 rounded-xl border border-border bg-background text-text-primary text-sm font-medium focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5">
              Phone Number / सम्पर्क फोन *
            </label>
            <input
              type="tel"
              required
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="e.g. 9841234567"
              className="w-full px-4 py-3 rounded-xl border border-border bg-background text-text-primary text-sm font-medium focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5">
              Email Address / इमेल ठेगाना *
            </label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="e.g. ram.thapa@example.com"
              className="w-full px-4 py-3 rounded-xl border border-border bg-background text-text-primary text-sm font-medium focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all"
            />
          </div>
        </div>
      </div>

      {/* Step 3: Consultation Preferences */}
      <div className="space-y-4">
        <h3 className="text-base sm:text-lg font-bold text-text-primary border-b border-border pb-2">
          3. Preferences &amp; Legal Practice Area
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Practice Area Select */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5">
              Relevant Legal Practice Area (मुद्दाको विधा) *
            </label>
            <select
              value={formData.practiceArea}
              onChange={(e) => setFormData({ ...formData, practiceArea: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-border bg-background text-text-primary text-sm font-medium focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all"
            >
              {PRACTICE_AREAS.map((area) => (
                <option key={area.value} value={area.value}>
                  {area.label}
                </option>
              ))}
            </select>
          </div>

          {/* Preferred Contact Method */}
          <div>
            <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-2">
              Preferred Contact Channel
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['PHONE', 'WHATSAPP', 'EMAIL'] as const).map((method) => (
                <button
                  type="button"
                  key={method}
                  onClick={() => setFormData({ ...formData, preferredContactMethod: method })}
                  className={`py-2.5 px-3 rounded-xl text-xs font-bold flex flex-col items-center gap-1 border transition-all ${
                    formData.preferredContactMethod === method
                      ? 'bg-accent text-white border-accent shadow-xs'
                      : 'bg-surface-alt hover:bg-black/5 dark:hover:bg-white/5 border-border text-text-secondary'
                  }`}
                >
                  {method === 'PHONE' && <Phone className="w-4 h-4" />}
                  {method === 'WHATSAPP' && <MessageSquare className="w-4 h-4 text-emerald-400" />}
                  {method === 'EMAIL' && <Mail className="w-4 h-4" />}
                  <span>{method}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Consultation Mode */}
          <div>
            <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-2">
              Consultation Mode
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { id: 'PHYSICAL', label: 'Office Visit', icon: Building2 },
                  { id: 'ONLINE', label: 'Online / Call', icon: Video },
                  { id: 'EITHER', label: 'Either', icon: Clock },
                ] as const
              ).map((mode) => {
                const Icon = mode.icon;
                return (
                  <button
                    type="button"
                    key={mode.id}
                    onClick={() => setFormData({ ...formData, consultationMode: mode.id })}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold flex flex-col items-center gap-1 border transition-all ${
                      formData.consultationMode === mode.id
                        ? 'bg-accent text-white border-accent shadow-xs'
                        : 'bg-surface-alt hover:bg-black/5 dark:hover:bg-white/5 border-border text-text-secondary'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{mode.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Preferred Time Slot */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5">
              Preferred Time of Day (इच्छुक समय)
            </label>
            <select
              value={formData.preferredTime}
              onChange={(e) => setFormData({ ...formData, preferredTime: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-border bg-background text-text-primary text-sm font-medium focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all"
            >
              <option value="Morning (10:00 AM - 1:00 PM)">Morning (बिहान १०:०० देखि १:०० बजेसम्म)</option>
              <option value="Afternoon (1:00 PM - 5:00 PM)">Afternoon (दिउँसो १:०० देखि ५:०० बजेसम्म)</option>
              <option value="Evening (After 5:00 PM)">Evening (साँझ ५:०० बजे पछि)</option>
              <option value="Weekend / Any Time">Any Convenient Time (जुनसुकै समय)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Step 4: Case Overview & Details */}
      <div className="space-y-4">
        <h3 className="text-base sm:text-lg font-bold text-text-primary border-b border-border pb-2">
          4. Legal Matter Details (मुद्दा वा परामर्शको विवरण)
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5">
              Subject / मुद्दाको विषय *
            </label>
            <input
              type="text"
              required
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              placeholder="e.g. Property Partition Suit, Trademark Infringement, Contract Breach"
              className="w-full px-4 py-3 rounded-xl border border-border bg-background text-text-primary text-sm font-medium focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5">
              Case Summary &amp; Inquiries / विस्तृत विवरण *
            </label>
            <textarea
              required
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Please provide a concise description of the facts, court jurisdiction (if already filed), parties involved, and the specific legal counsel or filing service you require."
              className="w-full px-4 py-3 rounded-xl border border-border bg-background text-text-primary text-sm font-medium focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all resize-y"
            />
            <p className="text-xs text-text-muted mt-1">
              Minimum 10 characters. Avoid sharing sensitive banking passwords or personal identification numbers.
            </p>
          </div>
        </div>
      </div>

      {/* Confidentiality & Ethics Pledge */}
      <div className="p-4 rounded-2xl bg-surface-alt border border-border flex items-start gap-3 text-xs text-text-secondary">
        <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
        <div>
          <strong>Strict Attorney-Client Confidentiality:</strong> Entertain Lawyers treats every consultation request with the highest ethical confidentiality governed by the Nepal Bar Council Code of Conduct. No details are disclosed to third parties.
        </div>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full py-4 px-6 rounded-2xl bg-accent hover:bg-accent-hover text-white text-base font-bold shadow-lg transition-all flex items-center justify-center gap-2 hover:shadow-[0_0_20px_rgba(var(--color-accent),0.4)] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? (
          <>
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            <span>Submitting Request...</span>
          </>
        ) : (
          <>
            <Send className="w-5 h-5" />
            <span>
              {selectedLawyer
                ? `Book Consultation with Advocate ${selectedLawyer.name}`
                : 'Submit Consultation Request (परामर्श अनुरोध पेश गर्नुहोस्)'}
            </span>
          </>
        )}
      </button>
    </form>
  );
}
