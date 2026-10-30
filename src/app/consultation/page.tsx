import { Metadata } from 'next';
import { Suspense } from 'react';
import { prisma } from '@/lib/prisma';
import ConsultationClient from '@/components/consultation/ConsultationClient';
import { ConsultationLawyer } from '@/components/consultation/ConsultationForm';

export const metadata: Metadata = {
  // The root layout's title template appends "| Entertain Lawyers".
  title: 'Consult a Certified Lawyer | Legal Consultation in Nepal',
  description:
    'Book an executive legal consultation with licensed Nepal Bar Council advocates in Pokhara & Kathmandu. Direct call, WhatsApp messaging, and scheduled in-person or online legal advisory.',
  keywords: [
    'Consult a lawyer Nepal',
    'certified advocate nepal',
    'nepal bar council lawyer',
    'legal consultation pokhara',
    'nepal advocate consultation',
    'hire lawyer in kathmandu nepal',
    'entertain lawyers consultation',
    'advocate ram babu das',
    'legal counsel pokhara',
  ],
  alternates: { canonical: '/consultation' },
};

export default async function ConsultationPage() {
  let lawyers: ConsultationLawyer[] = [];
  let loadError = false;

  try {
    const list = await prisma.consultationLawyer.findMany({
      where: { isAvailable: true },
      orderBy: [{ isFeatured: 'desc' }, { displayOrder: 'asc' }],
    });

    lawyers = list;
  } catch (error) {
    console.error('[ConsultationPage] Failed to fetch consultation lawyers from database:', error);
    loadError = true;
  }

  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background py-16 px-4 max-w-7xl mx-auto flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-3 border-accent/20 border-t-accent rounded-full animate-spin" />
            <p className="text-sm text-text-muted font-medium">Loading Legal Consultation Portal...</p>
          </div>
        </div>
      }
    >
      <ConsultationClient lawyers={lawyers} loadError={loadError} />
    </Suspense>
  );
}
