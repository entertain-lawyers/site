import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { ImageIcon, Images } from 'lucide-react';
import type { Metadata } from 'next';
import { Reveal } from '@/components/motion/primitives';

export const metadata: Metadata = {
  title: 'Photo Galleries',
  description: 'Moments, events, and memories from Entertain Lawyers.',
  alternates: { canonical: '/gallery' },
};

export const revalidate = 60;

export default async function GalleryListPage() {
  const galleries = await prisma.gallery.findMany({
    where: { status: 'PUBLISHED' },
    orderBy: { createdAt: 'desc' },
    include: {
      GalleryImage: {
        orderBy: { order: 'asc' },
        take: 1, // Only need the first image for the cover
      },
      _count: {
        select: { GalleryImage: true }
      }
    }
  });

  return (
    <div className="min-h-screen bg-background py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h1 className="text-4xl md:text-5xl font-black text-navy dark:text-white tracking-tight mb-6">
            Photo Galleries
          </h1>
          <p className="text-lg text-text-secondary leading-relaxed">
            Moments, events, and memories from Entertain Lawyers.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {galleries.map((gallery, i) => {
            const coverImage = gallery.GalleryImage[0]?.url;
            return (
              <Reveal index={i} perRow={3} lift key={gallery.id} className="group relative bg-surface border border-border rounded-2xl shadow-soft overflow-hidden transition-[box-shadow,border-color,background-color] duration-300 hover:shadow-lg flex flex-col">
                <div className="w-full h-64 bg-slate-100 dark:bg-zinc-800 flex items-center justify-center border-b border-border overflow-hidden relative">
                  {coverImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={coverImage} alt={gallery.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" loading="lazy" decoding="async" />
                  ) : (
                    <ImageIcon className="w-16 h-16 text-black/10 dark:text-white/10" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-300" />
                  
                  <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between z-10">
                    <span className="bg-black/50 backdrop-blur-md text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 border border-white/10">
                      <Images className="w-3.5 h-3.5" />
                      {gallery._count.GalleryImage} Photos
                    </span>
                  </div>
                </div>
                <div className="p-6 flex flex-col flex-1 bg-white dark:bg-zinc-900">
                  <h3 className="text-xl font-bold text-navy dark:text-white mb-3 line-clamp-2 leading-tight group-hover:text-accent transition-colors">
                    {gallery.title}
                  </h3>
                  {gallery.description && (
                    <p className="text-sm text-text-secondary line-clamp-2">
                      {gallery.description}
                    </p>
                  )}
                </div>
                <Link href={`/gallery/${gallery.id}`} className="absolute inset-0 z-10">
                  <span className="sr-only">View {gallery.title}</span>
                </Link>
              </Reveal>
            );
          })}

          {galleries.length === 0 && (
            <div className="col-span-full py-24 text-center border-2 border-dashed border-border rounded-3xl">
              <div className="w-20 h-20 bg-surface-alt rounded-full flex items-center justify-center mx-auto mb-6">
                <Images className="w-10 h-10 text-text-muted" />
              </div>
              <h3 className="text-2xl font-bold text-navy dark:text-white mb-2 tracking-tight">No galleries found</h3>
              <p className="text-text-secondary text-lg">Check back later for new photos.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
