import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { BookOpen, FileText } from 'lucide-react';
import { extractFirstImage } from '@/lib/media/extract-first-image';
import { sanitizeHtml } from '@/lib/sanitize';
import { Metadata } from 'next';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const pub = await prisma.publication.findUnique({
    where: { slug },
  });

  if (!pub || pub.status !== 'PUBLISHED') return { title: 'Publication Not Found' };

  return {
    title: `${pub.metaTitle || pub.title}`,
    description: pub.metaDesc || pub.description || `Publication by Entertain Lawyers`,
    alternates: { canonical: `/publications/${slug}` },
  };
}

export default async function PublicationDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const pub = await prisma.publication.findUnique({
    where: { slug },
  });

  if (!pub || pub.status !== 'PUBLISHED') {
    notFound();
  }

  const coverImage = pub.coverImage || extractFirstImage(pub.content);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0a0a0a] py-16 lg:py-24">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white dark:bg-zinc-950 rounded-3xl shadow-sm border border-black/5 dark:border-white/5 overflow-hidden">
          <div className="flex flex-col lg:flex-row">
            {/* Cover Image Section */}
            <div className="w-full lg:w-1/3 bg-slate-100 dark:bg-zinc-900 border-b lg:border-b-0 lg:border-r border-border p-8 md:p-12 flex flex-col items-center justify-center">
               {coverImage ? (
                 <div className="w-full max-w-[280px] aspect-[3/4] rounded-xl overflow-hidden shadow-2xl relative ring-1 ring-black/10 dark:ring-white/10">
                   {/* eslint-disable-next-line @next/next/no-img-element */}
                   <img src={coverImage} alt={pub.title} className="w-full h-full object-cover" loading="eager" fetchPriority="high" decoding="async" />
                 </div>
               ) : (
                 <div className="w-full max-w-[280px] aspect-[3/4] rounded-xl bg-surface-alt flex flex-col items-center justify-center text-text-muted border-2 border-dashed border-border">
                   <BookOpen className="w-16 h-16 mb-4" />
                   <span className="font-bold uppercase tracking-wider text-sm">No Cover</span>
                 </div>
               )}
            </div>

            {/* Content Section */}
            <div className="w-full lg:w-2/3 p-8 md:p-12 flex flex-col">
               <div className="mb-6 flex flex-wrap items-center gap-4 text-sm font-bold text-text-muted uppercase tracking-wider">
                 <span className="bg-accent/10 text-accent px-3 py-1 rounded-md border border-accent/20">
                   Publication
                 </span>
                 {pub.publishDate && (
                   <span>
                     {new Date(pub.publishDate).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                   </span>
                 )}
               </div>

               <h1 className="text-3xl md:text-4xl lg:text-5xl font-black text-navy dark:text-white leading-tight mb-8">
                 {pub.title}
               </h1>

               {pub.description && (
                 <p className="text-lg text-text-secondary leading-relaxed font-medium mb-10 pb-10 border-b border-border">
                   {pub.description}
                 </p>
               )}

               {pub.content && (
                 <div
                   className="prose prose-lg dark:prose-invert max-w-none prose-headings:font-bold prose-a:text-accent hover:prose-a:text-accent-dark mb-12"
                   dangerouslySetInnerHTML={{ __html: sanitizeHtml(pub.content) }}
                 />
               )}

               <div className="mt-auto pt-8 flex flex-col sm:flex-row items-center gap-4">
                 {pub.documentId ? (
                   <Link
                     href={`/read/${pub.id}`}
                     className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-4 bg-accent hover:bg-accent-hover text-white font-bold rounded-xl transition-all shadow-[0_4px_15px_rgba(var(--color-accent),0.3)] hover:shadow-[0_6px_20px_rgba(var(--color-accent),0.4)] hover:-translate-y-0.5"
                   >
                     <FileText className="w-5 h-5" />
                     Read Document
                   </Link>
                 ) : (
                   <div className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-4 bg-surface-alt text-text-muted font-bold rounded-xl border border-border cursor-not-allowed">
                     <FileText className="w-5 h-5" />
                     Document Unavailable
                   </div>
                 )}
                 <Link href="/publications" className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-4 text-navy dark:text-white font-bold rounded-xl border border-border hover:border-accent hover:text-accent hover:bg-accent/5 transition-colors">
                   Back to Library
                 </Link>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
