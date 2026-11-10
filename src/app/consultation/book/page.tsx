import { Metadata } from 'next';
import Link from 'next/link';
import { ChevronLeft, ShieldCheck } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import ConsultationForm, { ConsultationLawyer } from '@/components/consultation/ConsultationForm';

export const metadata: Metadata = {
  title: 'Book a Consultation | Legal Advisory Nepal',
  description: 'Book a legal consultation with certified Nepal Bar Council advocates in Pokhara & Kathmandu.',
  alternates: { canonical: '/consultation/book' },
};

interface GeneralBookingPageProps {
  searchParams: Promise<{ lawyer?: string }>;
}

export default async function GeneralBookingPage({ searchParams }: GeneralBookingPageProps) {
  const { lawyer: lawyerSlug } = await searchParams;

  let lawyers: ConsultationLawyer[] = [];
  let preselectedLawyer: ConsultationLawyer | null = null;

  try {
    lawyers = await prisma.consultationLawyer.findMany({
      where: { isAvailable: true },
      orderBy: [{ isFeatured: 'desc' }, { displayOrder: 'asc' }],
    });

    if (lawyerSlug) {
      preselectedLawyer = lawyers.find((l) => l.slug === lawyerSlug || l.id === lawyerSlug) || null;
    }
  } catch (err) {
    console.error('[GeneralBookingPage] Failed to fetch lawyers:', err);
  }

  return (
    <main className="min-h-screen bg-background py-10 sm:py-14">
      <div className="mx-auto max-w-3xl space-y-6 px-4 sm:px-6 lg:px-8">
        <div>
          <Link
            href="/consultation"
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2 text-sm font-bold text-text-secondary transition-colors hover:border-accent hover:text-navy dark:hover:text-white"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            Back to Advocate Directory
          </Link>
        </div>

        <div className="space-y-2 text-center sm:text-left">
          <span className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/10 px-3.5 py-1.5 text-xs font-bold text-accent">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" /> Confidential Advisory
          </span>
          <h1 className="text-3xl font-black text-navy dark:text-white sm:text-4xl">
            Book a Legal Consultation
          </h1>
          <p className="text-sm text-text-secondary sm:text-base">
            Share your contact details and legal situation. Our chambers team reviews every request and contacts you via phone or WhatsApp.
          </p>
        </div>

        <ConsultationForm
          lawyers={lawyers}
          selectedLawyer={preselectedLawyer}
        />
      </div>
    </main>
  );
}
