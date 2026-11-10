import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronLeft, ShieldCheck } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import ConsultationForm from '@/components/consultation/ConsultationForm';

interface LawyerBookingPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: LawyerBookingPageProps): Promise<Metadata> {
  const { slug } = await params;
  const lawyer = await prisma.consultationLawyer.findUnique({
    where: { slug },
    select: { name: true, title: true },
  });

  if (!lawyer) {
    return { title: 'Book a Consultation' };
  }

  return {
    title: `Book a Consultation with Advocate ${lawyer.name}`,
    description: `Schedule an executive legal consultation with licensed Nepal Bar Council Advocate ${lawyer.name}.`,
    alternates: { canonical: `/consultation/${slug}/book` },
  };
}

export default async function LawyerBookingPage({ params }: LawyerBookingPageProps) {
  const { slug } = await params;

  const lawyer = await prisma.consultationLawyer.findUnique({
    where: { slug },
  });

  if (!lawyer || !lawyer.isAvailable) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-background py-10 sm:py-14">
      <div className="mx-auto max-w-3xl space-y-6 px-4 sm:px-6 lg:px-8">
        {/* Back Link */}
        <div>
          <Link
            href={`/consultation/${lawyer.slug}`}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2 text-sm font-bold text-text-secondary transition-colors hover:border-accent hover:text-navy dark:hover:text-white"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            Back to Advocate {lawyer.name}&apos;s profile
          </Link>
        </div>

        {/* Lawyer Summary Card */}
        <div className="flex items-center gap-4 rounded-3xl border border-border bg-surface p-4 shadow-sm sm:p-5">
          <div className="relative aspect-[4/5] w-14 shrink-0 overflow-hidden rounded-xl bg-surface-alt ring-1 ring-border sm:w-16">
            {lawyer.imageUrl ? (
              <Image src={lawyer.imageUrl} alt={lawyer.name} fill className="object-cover" />
            ) : (
              <div aria-hidden="true" className="flex h-full w-full items-center justify-center text-xl font-black text-accent">
                {lawyer.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-accent">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" /> Dedicated Legal Advisory
            </span>
            <h2 className="truncate text-lg font-black text-navy dark:text-white sm:text-xl">
              Advocate {lawyer.name}
            </h2>
            <p className="truncate text-xs font-medium text-text-secondary sm:text-sm">
              {lawyer.title || 'Advocate'}
              {lawyer.lawFirm ? ` · ${lawyer.lawFirm}` : ''}
              {lawyer.serviceCities ? ` · ${lawyer.serviceCities}` : ''}
            </p>
          </div>
        </div>

        {/* The Intake Form (Photo 1) */}
        <ConsultationForm selectedLawyer={lawyer} />
      </div>
    </main>
  );
}
