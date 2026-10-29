import { Metadata } from 'next';
import { Suspense } from 'react';
import { prisma } from '@/lib/prisma';
import ConsultationClient from '@/components/consultation/ConsultationClient';
import { ConsultationLawyer } from '@/components/consultation/ConsultationForm';

export const metadata: Metadata = {
  title: 'Consult a Certified Lawyer | Legal Consultation in Nepal | Entertain Lawyers',
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

  try {
    const list = await prisma.consultationLawyer.findMany({
      where: { isAvailable: true },
      orderBy: [{ isFeatured: 'desc' }, { displayOrder: 'asc' }],
    });

    lawyers = list;
  } catch (error) {
    console.error('[ConsultationPage] Failed to fetch consultation lawyers from database:', error);
  }

  // Fallback: Ensure certified advocate Ram Babu Das is present if table is empty
  if (lawyers.length === 0) {
    lawyers = [
      {
        id: 'acc06d44-97d3-44e5-bc4a-0a2de6df5585',
        name: 'Ram Babu Das',
        slug: 'ram-babu-das',
        title: 'Advocate / Senior Legal Counsel',
        licenseNumber: 'Nepal Bar Council Regd. No. 24890',
        specialization: 'Civil Litigation, Property Partition & Corporate Advisory',
        practiceAreas: 'Civil & Commercial Law, Property Partition, Corporate Advisory, Constitutional Law, Contract Drafting',
        courtJurisdiction: 'Supreme Court of Nepal, High Courts & District Courts',
        experience: '7+ Years Legal Practice',
        qualifications: 'LL.M. (Commercial Law), B.A. LL.B.',
        languages: 'Nepali, English, Maithili, Hindi',
        phone: '+977 9822010737',
        email: 'baburam.jnk@gmail.com',
        whatsappNumber: '+9779822010737',
        location: 'Pokhara & Kathmandu Chambers',
        shortBio: 'Certified Advocate licensed by Nepal Bar Council specializing in civil dispute resolution, ancestral property partitions, corporate advisory, and high-stakes commercial litigation.',
        bio: 'Advocate Ram Babu Das is a licensed legal practitioner with extensive advocacy and litigation experience across Nepal judicial hierarchy, including the Supreme Court of Nepal and High Courts.',
        imageUrl: '/uploads/editorial/team/2026-10-10-a37e81ad-b750-4da2-be04-51896e144475.jpg',
        rating: 5.0,
        displayOrder: 1,
        isAvailable: true,
        isFeatured: true,
      },
    ];
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
      <ConsultationClient lawyers={lawyers} />
    </Suspense>
  );
}
