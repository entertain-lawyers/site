import os

# --- EVENTS ---
list_events = """import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import DeleteEventButton from './DeleteEventButton';

export default async function AdminEventsPage() {
  const session = await auth();
  if (!session?.user?.id || (session.user.role !== 'ADMIN' && session.user.role !== 'EDITOR')) {
    redirect('/');
  }

  const events = await prisma.event.findMany({
    orderBy: { eventDate: 'desc' },
    include: { author: { select: { email: true } } }
  });

  return (
    <div className="py-10 px-4 sm:px-6 lg:px-8 max-w-[1400px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-10 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-navy dark:text-white tracking-tight">Events</h1>
          <p className="mt-2 text-text-secondary font-medium">Manage platform events.</p>
        </div>
        <div className="flex-shrink-0">
          <Link href="/admin/events/new" className="inline-flex items-center justify-center px-6 py-2.5 border border-transparent shadow-sm text-sm font-bold rounded-xl text-white bg-accent hover:bg-accent/90 transition-all duration-300 hover:-translate-y-0.5">
            Create Event
          </Link>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-sm border border-black/5 dark:border-white/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-black/5 dark:divide-white/5">
          <thead className="bg-slate-50/80 dark:bg-zinc-900/80 backdrop-blur-md">
            <tr>
              <th className="px-8 py-4 text-left text-xs font-bold text-text-muted uppercase tracking-wider">Title</th>
              <th className="px-8 py-4 text-left text-xs font-bold text-text-muted uppercase tracking-wider">Date</th>
              <th className="px-8 py-4 text-left text-xs font-bold text-text-muted uppercase tracking-wider">Status</th>
              <th className="px-8 py-4 text-right text-xs font-bold text-text-muted uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-zinc-900 divide-y divide-black/5 dark:divide-white/5">
            {events.length > 0 ? (
              events.map((evt) => (
                <tr key={evt.id} className="hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors group">
                  <td className="px-8 py-5 whitespace-nowrap text-sm font-bold text-navy dark:text-white">{evt.title}</td>
                  <td className="px-8 py-5 whitespace-nowrap text-sm font-medium text-text-secondary">{evt.eventDate.toLocaleDateString()}</td>
                  <td className="px-8 py-5 whitespace-nowrap text-sm">
                    <span className={`px-3 py-1 inline-flex text-xs font-bold rounded-full border ${evt.status === 'PUBLISHED' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                      {evt.status === 'PUBLISHED' ? 'Published' : 'Draft'}
                    </span>
                  </td>
                  <td className="px-8 py-5 whitespace-nowrap text-right text-sm font-medium flex justify-end gap-2">
                    <Link href={`/admin/events/${evt.id}/edit`} className="inline-flex items-center justify-center px-4 py-2 border border-black/5 dark:border-white/5 rounded-lg text-navy dark:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors shadow-sm">Edit</Link>
                    <DeleteEventButton id={evt.id} />
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="px-8 py-16 text-center">
                  <p className="text-sm text-text-secondary">No events found.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
    </div>
  );
}
"""

delete_event = """'use client';
import { useState } from 'react';
import { deleteEventAction } from '@/modules/admin/admin-event.actions';

export default function DeleteEventButton({ id }: { id: string }) {
  const [loading, setLoading] = useState(false);
  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this event?')) return;
    setLoading(true);
    const res = await deleteEventAction({ id });
    if (!res?.success) alert((res as any)?.error || 'Error deleting event');
    setLoading(false);
  };
  return (
    <button onClick={handleDelete} disabled={loading} className="inline-flex items-center justify-center px-4 py-2 border border-red-200 rounded-lg text-red-600 hover:bg-red-50 transition-colors shadow-sm disabled:opacity-50">
      Delete
    </button>
  );
}
"""

new_event = """'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createEventAction } from '@/modules/admin/admin-event.actions';
import RichTextEditor from '@/components/editor/RichTextEditor';
import ImageUpload from '@/components/admin/ImageUpload';

export default function NewEventPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [location, setLocation] = useState('');
  const [featuredImage, setFeaturedImage] = useState('');
  const [status, setStatus] = useState<'DRAFT'|'PUBLISHED'|'ARCHIVED'>('DRAFT');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    const res = await createEventAction({
      title, slug, description, content, eventDate, location, featuredImage, status
    });

    if (res?.success) {
      router.push('/admin/events');
      router.refresh();
    } else {
      setError((res as any)?.error || 'Error creating event');
      setLoading(false);
    }
  };

  return (
    <div className="py-10 px-4 sm:px-6 lg:px-8 max-w-[1000px] mx-auto">
      <h1 className="text-3xl font-extrabold text-navy dark:text-white mb-6">Create Event</h1>
      {error && <div className="p-4 bg-red-50 text-red-600 mb-6 rounded-lg">{error}</div>}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div><label className="block text-sm font-bold mb-2">Title</label><input required value={title} onChange={e => setTitle(e.target.value)} className="w-full border p-3 rounded-xl" /></div>
        <div><label className="block text-sm font-bold mb-2">Slug</label><input required pattern="^[a-z0-9-]+$" value={slug} onChange={e => setSlug(e.target.value)} className="w-full border p-3 rounded-xl" /></div>
        <div><label className="block text-sm font-bold mb-2">Description</label><textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full border p-3 rounded-xl h-24" /></div>
        <div><label className="block text-sm font-bold mb-2">Event Date</label><input required type="datetime-local" value={eventDate} onChange={e => setEventDate(e.target.value)} className="w-full border p-3 rounded-xl" /></div>
        <div><label className="block text-sm font-bold mb-2">Location</label><input value={location} onChange={e => setLocation(e.target.value)} className="w-full border p-3 rounded-xl" /></div>
        <div><label className="block text-sm font-bold mb-2">Status</label><select value={status} onChange={e => setStatus(e.target.value as any)} className="w-full border p-3 rounded-xl"><option value="DRAFT">Draft</option><option value="PUBLISHED">Published</option><option value="ARCHIVED">Archived</option></select></div>
        <ImageUpload value={featuredImage} onChange={setFeaturedImage} type="EVENT" label="Featured Image" />
        <div><label className="block text-sm font-bold mb-2">Content</label><RichTextEditor value={content} onChange={setContent} /></div>
        <button type="submit" disabled={loading} className="bg-accent text-white px-6 py-3 rounded-xl font-bold">{loading ? 'Saving...' : 'Save Event'}</button>
      </form>
    </div>
  );
}
"""

edit_event = """import { prisma } from '@/lib/prisma';
import EditEventClient from './EditEventClient';
import { notFound } from 'next/navigation';

export default async function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const id = (await params).id;
  const evt = await prisma.event.findUnique({ where: { id } });
  if (!evt) notFound();
  return <EditEventClient evt={evt} />;
}
"""

edit_event_client = """'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateEventAction } from '@/modules/admin/admin-event.actions';
import RichTextEditor from '@/components/editor/RichTextEditor';
import ImageUpload from '@/components/admin/ImageUpload';

export default function EditEventClient({ evt }: { evt: any }) {
  const router = useRouter();
  const [title, setTitle] = useState(evt.title);
  const [slug, setSlug] = useState(evt.slug);
  const [description, setDescription] = useState(evt.description || '');
  const [content, setContent] = useState(evt.content || '');
  
  // Format datetime-local string
  const d = new Date(evt.eventDate);
  const tzOffset = d.getTimezoneOffset() * 60000;
  const localIso = (new Date(d.getTime() - tzOffset)).toISOString().slice(0, 16);
  const [eventDate, setEventDate] = useState(localIso);
  
  const [location, setLocation] = useState(evt.location || '');
  const [featuredImage, setFeaturedImage] = useState(evt.featuredImage || '');
  const [status, setStatus] = useState<'DRAFT'|'PUBLISHED'|'ARCHIVED'>(evt.status);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    const res = await updateEventAction({
      id: evt.id, title, slug, description, content, eventDate, location, featuredImage, status
    });

    if (res?.success) {
      router.push('/admin/events');
      router.refresh();
    } else {
      setError((res as any)?.error || 'Error updating event');
      setLoading(false);
    }
  };

  return (
    <div className="py-10 px-4 sm:px-6 lg:px-8 max-w-[1000px] mx-auto">
      <h1 className="text-3xl font-extrabold text-navy dark:text-white mb-6">Edit Event</h1>
      {error && <div className="p-4 bg-red-50 text-red-600 mb-6 rounded-lg">{error}</div>}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div><label className="block text-sm font-bold mb-2">Title</label><input required value={title} onChange={e => setTitle(e.target.value)} className="w-full border p-3 rounded-xl" /></div>
        <div><label className="block text-sm font-bold mb-2">Slug</label><input required pattern="^[a-z0-9-]+$" value={slug} onChange={e => setSlug(e.target.value)} className="w-full border p-3 rounded-xl" /></div>
        <div><label className="block text-sm font-bold mb-2">Description</label><textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full border p-3 rounded-xl h-24" /></div>
        <div><label className="block text-sm font-bold mb-2">Event Date</label><input required type="datetime-local" value={eventDate} onChange={e => setEventDate(e.target.value)} className="w-full border p-3 rounded-xl" /></div>
        <div><label className="block text-sm font-bold mb-2">Location</label><input value={location} onChange={e => setLocation(e.target.value)} className="w-full border p-3 rounded-xl" /></div>
        <div><label className="block text-sm font-bold mb-2">Status</label><select value={status} onChange={e => setStatus(e.target.value as any)} className="w-full border p-3 rounded-xl"><option value="DRAFT">Draft</option><option value="PUBLISHED">Published</option><option value="ARCHIVED">Archived</option></select></div>
        <ImageUpload value={featuredImage} onChange={setFeaturedImage} type="EVENT" label="Featured Image" />
        <div><label className="block text-sm font-bold mb-2">Content</label><RichTextEditor value={content} onChange={setContent} /></div>
        <button type="submit" disabled={loading} className="bg-accent text-white px-6 py-3 rounded-xl font-bold">{loading ? 'Saving...' : 'Save Event'}</button>
      </form>
    </div>
  );
}
"""

with open('src/app/admin/events/page.tsx', 'w') as f: f.write(list_events)
with open('src/app/admin/events/DeleteEventButton.tsx', 'w') as f: f.write(delete_event)
with open('src/app/admin/events/new/page.tsx', 'w') as f: f.write(new_event)
with open('src/app/admin/events/[id]/edit/page.tsx', 'w') as f: f.write(edit_event)
with open('src/app/admin/events/[id]/edit/EditEventClient.tsx', 'w') as f: f.write(edit_event_client)

print("Generated Events UI")
