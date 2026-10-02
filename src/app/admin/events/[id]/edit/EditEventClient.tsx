'use client';
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
