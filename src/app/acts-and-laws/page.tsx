import type { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import ActsAndLawsClient, { type ActItem } from '@/components/acts/ActsAndLawsClient';
import { isMissingTableError } from '@/lib/prisma-errors';

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
  let acts: ActItem[] = [];
  try {
    acts = await prisma.actLaw.findMany({
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
  } catch (error) {
    if (!isMissingTableError(error)) {
      console.error('[acts-and-laws] Database error:', error);
    }
  }

  return <ActsAndLawsClient initialActs={acts} />;
}
