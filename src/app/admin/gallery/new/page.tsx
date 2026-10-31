'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createGalleryAction } from '@/modules/admin/admin-gallery.actions';
import { MotionButton } from '@/components/motion/primitives';

export default function NewGalleryPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'DRAFT'|'PUBLISHED'|'ARCHIVED'>('DRAFT');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const res = await createGalleryAction({ title, description, status });

    if (res?.success) {
      router.push(`/admin/gallery/${res.data.id}/edit`);
    } else {
      setError((res as any)?.error || 'Error creating gallery');
      setLoading(false);
    }
  };

  return (
    <div className="py-10 px-4 sm:px-6 lg:px-8 max-w-[1000px] mx-auto">
      <h1 className="text-3xl font-extrabold text-navy dark:text-white mb-6">Create Gallery</h1>
      <p className="mb-6 text-text-secondary">You can add images to the gallery after creating it.</p>
      {error && <div className="p-4 bg-red-50 text-red-600 mb-6 rounded-lg">{error}</div>}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div><label htmlFor="gallery-title" className="block text-sm font-bold mb-2">Title</label><input id="gallery-title" required value={title} onChange={e => setTitle(e.target.value)} className="w-full border p-3 rounded-xl" /></div>
        <div><label htmlFor="gallery-description" className="block text-sm font-bold mb-2">Description</label><textarea id="gallery-description" value={description} onChange={e => setDescription(e.target.value)} className="w-full border p-3 rounded-xl h-24" /></div>
        <div><label htmlFor="gallery-status" className="block text-sm font-bold mb-2">Status</label><select id="gallery-status" value={status} onChange={e => setStatus(e.target.value as any)} className="w-full border p-3 rounded-xl"><option value="DRAFT">Draft</option><option value="PUBLISHED">Published</option><option value="ARCHIVED">Archived</option></select></div>
        <MotionButton type="submit" disabled={loading} className="bg-accent text-white px-6 py-3 rounded-xl font-bold">{loading ? 'Saving...' : 'Save & Continue to Images'}</MotionButton>
      </form>
    </div>
  );
}
