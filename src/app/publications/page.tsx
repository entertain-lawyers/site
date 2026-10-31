import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { BookOpen, FileText } from 'lucide-react';
import { extractFirstImage } from '@/lib/media/extract-first-image';
import type { Metadata } from 'next';
import { Reveal } from '@/components/motion/primitives';

export const metadata: Metadata = {
  title: 'Publications',
  description: 'Journals, books, and in-depth legal analyses published by Entertain Lawyers.',
  alternates: { canonical: '/publications' },
};

export const revalidate = 60;

export default async function PublicationsPage() {
  const publications = await prisma.publication.findMany({
    where: { status: 'PUBLISHED' },
    orderBy: { publishDate: 'desc' },
  });

  return (
    <div className="min-h-screen bg-background py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h1 className="text-4xl md:text-5xl font-black text-navy dark:text-white tracking-tight mb-6">
            Publications
          </h1>
          <p className="text-lg text-text-secondary leading-relaxed">
            Journals, books, and in-depth legal analyses published by Entertain Lawyers.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {publications.map((pub, i) => {
            const thumbnail = pub.coverImage || extractFirstImage(pub.content);
            return (
              <Reveal index={i} perRow={3} lift key={pub.id} className="group relative bg-surface border border-border rounded-2xl shadow-soft overflow-hidden transition-[box-shadow,border-color,background-color] duration-300 hover:shadow-lg flex flex-col">
                <div className="w-full aspect-[3/4] bg-slate-100 dark:bg-zinc-800 flex items-center justify-center border-b border-border overflow-hidden relative">
                  {thumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={thumbnail} alt={pub.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" decoding="async" />
                  ) : (
                    <BookOpen className="w-16 h-16 text-black/10 dark:text-white/10" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </div>
                <div className="p-6 flex flex-col flex-1 bg-white dark:bg-zinc-900">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-navy dark:text-white mb-3 line-clamp-2 leading-snug group-hover:text-accent transition-colors">
                      {pub.title}
                    </h3>
                    {pub.publishDate && (
                      <p className="text-xs text-text-muted font-medium mb-3 uppercase tracking-wider">
                        {new Date(pub.publishDate).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                      </p>
                    )}
                    {pub.description && (
                      <p className="text-text-secondary line-clamp-3 text-sm">{pub.description}</p>
                    )}
                  </div>
                  <div className="mt-5 pt-5 border-t border-border flex items-center justify-between">
                    <span className="text-xs font-bold text-accent uppercase tracking-widest flex items-center gap-2">
                      <FileText className="w-3.5 h-3.5" /> Details
                    </span>
                  </div>
                </div>
                <Link href={`/publications/${pub.slug}`} className="absolute inset-0 z-10">
                  <span className="sr-only">View {pub.title}</span>
                </Link>
              </Reveal>
            );
          })}

          {publications.length === 0 && (
            <div className="col-span-full py-24 text-center border-2 border-dashed border-border rounded-3xl">
              <div className="w-20 h-20 bg-surface-alt rounded-full flex items-center justify-center mx-auto mb-6">
                <BookOpen className="w-10 h-10 text-text-muted" />
              </div>
              <h3 className="text-2xl font-bold text-navy dark:text-white mb-2 tracking-tight">No publications found</h3>
              <p className="text-text-secondary text-lg">Check back later for new journals and books.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
