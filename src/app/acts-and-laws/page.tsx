import type { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import ActsAndLawsClient from '@/components/acts/ActsAndLawsClient';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Acts and Laws — Nepal Legal Documents & Regulations',
  description:
    'Get all the important Acts, Laws & Regulations of Nepal in alphabetical order. View and download official PDF legal documents, Constitution, Rules, and Ordinances.',
  alternates: {
    canonical: '/acts-and-laws',
  },
};

export default async function ActsAndLawsPage() {
  const acts = await prisma.actLaw.findMany({
    where: { status: 'PUBLISHED' },
    orderBy: { title: 'asc' },
    select: {
      id: true,
      title: true,
      titleEn: true,
      slug: true,
      category: true,
      description: true,
      documentUrl: true,
      fileSize: true,
      publishDate: true,
      status: true,
    },
  });

  return <ActsAndLawsClient initialActs={acts} />;
}
