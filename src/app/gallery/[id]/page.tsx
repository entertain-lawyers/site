import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Metadata } from 'next';
import { ArrowLeft } from 'lucide-react';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const gallery = await prisma.gallery.findUnique({
    where: { id },
  });

  if (!gallery || gallery.status !== 'PUBLISHED') return { title: 'Gallery Not Found' };

  return {
    title: `${gallery.title}`,
    description: gallery.description || `Photo gallery from Entertain Lawyers`,
    alternates: { canonical: `/gallery/${id}` },
  };
}

export default async function GalleryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const gallery = await prisma.gallery.findUnique({
    where: { id },
    include: {
      GalleryImage: {
        orderBy: { order: 'asc' }
      }
    }
  });

  if (!gallery || gallery.status !== 'PUBLISHED') {
    notFound();
  }

  return (
    <div className="min-h-screen bg-background py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="mb-8 flex items-center">
          <Link href="/gallery" className="inline-flex items-center gap-2 text-sm font-bold text-text-muted hover:text-accent transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Galleries
          </Link>
        </div>

        <div className="mb-12">
          <h1 className="text-3xl md:text-5xl font-black text-navy dark:text-white tracking-tight mb-4">
            {gallery.title}
          </h1>
          {gallery.description && (
            <p className="text-lg text-text-secondary leading-relaxed max-w-3xl">
              {gallery.description}
            </p>
          )}
        </div>

        {gallery.GalleryImage.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {gallery.GalleryImage.map((image) => (
              <div key={image.id} className="group relative aspect-square bg-slate-100 dark:bg-zinc-800 rounded-xl overflow-hidden shadow-sm border border-border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src={image.url} 
                  alt={image.altText || image.caption || gallery.title} 
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  loading="lazy"
                  decoding="async"
                />
                {(image.caption || image.altText) && (
                  <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <p className="text-white text-sm font-medium line-clamp-2 drop-shadow-md">
                      {image.caption || image.altText}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="py-20 text-center border-2 border-dashed border-border rounded-2xl bg-surface-alt/50">
            <p className="text-text-secondary font-medium text-lg">No images in this gallery yet.</p>
          </div>
        )}
        
      </div>
    </div>
  );
}
