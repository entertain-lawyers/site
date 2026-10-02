import { prisma } from '@/lib/prisma';
import EditGalleryClient from './EditGalleryClient';
import { notFound } from 'next/navigation';

export default async function EditGalleryPage({ params }: { params: Promise<{ id: string }> }) {
  const id = (await params).id;
  const gal = await prisma.gallery.findUnique({
    where: { id },
    include: { images: { orderBy: { order: 'asc' } } }
  });
  if (!gal) notFound();
  return <EditGalleryClient gal={gal} />;
}
