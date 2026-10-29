import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Calendar, MapPin } from 'lucide-react';
import { extractFirstImage } from '@/lib/media/extract-first-image';
import { sanitizeHtml } from '@/lib/sanitize';
import { Metadata } from 'next';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const event = await prisma.event.findUnique({
    where: { slug },
  });

  if (!event || event.status !== 'PUBLISHED') return { title: 'Event Not Found' };

  return {
    title: `${event.metaTitle || event.title}`,
    description: event.metaDesc || event.description || `Event on ${new Date(event.eventDate).toLocaleDateString()}`,
    alternates: { canonical: `/events/${slug}` },
  };
}

export default async function EventDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await prisma.event.findUnique({
    where: { slug },
  });

  if (!event || event.status !== 'PUBLISHED') {
    notFound();
  }

  const heroImage = event.featuredImage || extractFirstImage(event.content);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0a0a0a] pb-24">
      {heroImage ? (
        <div className="w-full h-[40vh] md:h-[60vh] relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={heroImage} alt={event.title} className="w-full h-full object-cover" loading="eager" fetchPriority="high" decoding="async" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent"></div>
          <div className="absolute bottom-0 left-0 w-full p-6 md:p-12 max-w-5xl mx-auto">
             <div className="flex items-center gap-4 mb-4 text-white font-medium drop-shadow-md">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  <span>{new Date(event.eventDate).toLocaleDateString()}</span>
                </div>
                {event.location && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    <span>{event.location}</span>
                  </div>
                )}
             </div>
             <h1 className="text-3xl md:text-5xl lg:text-6xl font-black text-white leading-tight drop-shadow-lg">
                {event.title}
             </h1>
          </div>
        </div>
      ) : (
        <div className="bg-navy dark:bg-zinc-900 pt-32 pb-20 px-6">
           <div className="max-w-4xl mx-auto text-center">
             <div className="flex items-center justify-center gap-6 mb-6 text-white font-medium">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  <span>{new Date(event.eventDate).toLocaleDateString()}</span>
                </div>
                {event.location && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    <span>{event.location}</span>
                  </div>
                )}
             </div>
             <h1 className="text-3xl md:text-5xl lg:text-6xl font-black text-white leading-tight drop-shadow-lg">
                {event.title}
             </h1>
           </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mt-12">
        <article className="bg-white dark:bg-zinc-950 p-6 md:p-10 lg:p-12 rounded-3xl shadow-sm border border-black/5 dark:border-white/5">
          {event.description && (
             <p className="text-lg text-text-secondary font-medium mb-10 pb-10 border-b border-border leading-relaxed">
               {event.description}
             </p>
          )}

          {event.content && (
            <div
              className="prose prose-lg dark:prose-invert max-w-none prose-headings:font-bold prose-a:text-accent hover:prose-a:text-accent-dark prose-img:rounded-xl prose-img:shadow-md"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(event.content) }}
            />
          )}

          <div className="mt-16 pt-8 border-t border-border flex justify-center">
            <Link href="/events" className="inline-flex items-center justify-center px-8 py-3 text-sm font-bold rounded-full border-2 border-border text-navy dark:text-white hover:border-accent hover:text-accent transition-colors">
              &larr; Back to Events
            </Link>
          </div>
        </article>
      </div>
    </div>
  );
}
