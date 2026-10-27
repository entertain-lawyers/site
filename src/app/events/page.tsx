import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { Calendar, MapPin } from 'lucide-react';
import { extractFirstImage } from '@/lib/media/extract-first-image';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Events',
  description: 'Upcoming and past events, seminars, and workshops from Entertain Lawyers.',
  alternates: { canonical: '/events' },
};

export const revalidate = 60;

export default async function EventsPage() {
  const events = await prisma.event.findMany({
    where: { status: 'PUBLISHED' },
    orderBy: { eventDate: 'desc' },
    select: {
      id: true, title: true, slug: true, description: true,
      eventDate: true, location: true, featuredImage: true, content: true,
    },
  });

  return (
    <div className="min-h-screen bg-background py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h1 className="text-4xl md:text-5xl font-black text-navy dark:text-white tracking-tight mb-6">
            Events
          </h1>
          <p className="text-lg text-text-secondary leading-relaxed">
            Upcoming and past events, seminars, and workshops.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {events.map(event => {
            const thumbnail = event.featuredImage || extractFirstImage(event.content);
            return (
              <div key={event.id} className="bg-surface border border-border rounded-2xl shadow-soft overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1 flex flex-col">
                <div className="w-full h-48 bg-slate-100 dark:bg-zinc-800 flex items-center justify-center border-b border-border overflow-hidden">
                  {thumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={thumbnail} alt={event.title} className="w-full h-full object-cover" loading="lazy" decoding="async" />
                  ) : (
                    <Calendar className="w-12 h-12 text-black/10 dark:text-white/10" />
                  )}
                </div>
                <div className="p-6 sm:p-8 flex flex-col flex-1 bg-white dark:bg-zinc-900">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-navy dark:text-white mb-4 line-clamp-2 leading-tight">
                      {event.title}
                    </h3>
                    <div className="flex flex-col gap-2 text-sm text-text-secondary mb-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-accent" />
                        <span>{new Date(event.eventDate).toLocaleDateString()}</span>
                      </div>
                      {event.location && (
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-accent" />
                          <span>{event.location}</span>
                        </div>
                      )}
                    </div>
                    {event.description && (
                      <p className="text-text-secondary line-clamp-2 mb-4 text-sm">{event.description}</p>
                    )}
                  </div>
                  <div className="mt-6">
                    <Link href={`/events/${event.slug}`} className="text-accent font-bold text-sm uppercase tracking-wider hover:text-accent-dark transition-colors flex items-center">
                      VIEW EVENT &raquo;
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}

          {events.length === 0 && (
            <div className="col-span-full py-20 text-center">
              <div className="w-16 h-16 bg-surface-alt rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-8 h-8 text-text-muted" />
              </div>
              <h3 className="text-xl font-bold text-navy dark:text-white mb-2">No events found</h3>
              <p className="text-text-secondary">Check back later for new events.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
