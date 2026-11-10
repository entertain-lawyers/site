import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import LawyerProfileView from '@/components/consultation/LawyerProfileView';

interface LawyerPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: LawyerPageProps): Promise<Metadata> {
  const { slug } = await params;
  const lawyer = await prisma.consultationLawyer.findUnique({
    where: { slug },
    select: { name: true, title: true, specialization: true, serviceCities: true, bio: true },
  });

  if (!lawyer) {
    return { title: 'Advocate Profile' };
  }

  const title = `Advocate ${lawyer.name} | Certified Lawyer Profile`;
  const description =
    lawyer.bio?.slice(0, 160) ||
    `Consult Advocate ${lawyer.name} (${lawyer.title || 'Advocate'}). Specialization: ${lawyer.specialization || 'General practice'}. Service cities: ${lawyer.serviceCities || 'Nepal'}.`;

  return {
    title,
    description,
    alternates: { canonical: `/consultation/${slug}` },
  };
}

export default async function LawyerProfilePage({ params }: LawyerPageProps) {
  const { slug } = await params;

  const lawyer = await prisma.consultationLawyer.findUnique({
    where: { slug },
  });

  if (!lawyer || !lawyer.isAvailable) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-background py-10 sm:py-14">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <LawyerProfileView lawyer={lawyer} />
      </div>
    </main>
  );
}
