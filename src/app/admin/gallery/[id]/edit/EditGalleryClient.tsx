'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateGalleryAction, addGalleryImageAction, deleteGalleryImageAction, reorderGalleryImageAction } from '@/modules/admin/admin-gallery.actions';
import ImageUpload from '@/components/admin/ImageUpload';
import { ArrowUp, ArrowDown, Trash2 } from 'lucide-react';

export default function EditGalleryClient({ gal }: { gal: any }) {
  const router = useRouter();
  const [title, setTitle] = useState(gal.title);
  const [description, setDescription] = useState(gal.description || '');
  const [status, setStatus] = useState<'DRAFT'|'PUBLISHED'|'ARCHIVED'>(gal.status);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Image Upload State
  const [newImageUrl, setNewImageUrl] = useState('');
  const [newImageAlt, setNewImageAlt] = useState('');
  const [newImageCaption, setNewImageCaption] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const res = await updateGalleryAction({ id: gal.id, title, description, status });

    if (res?.success) {
      router.refresh();
      alert('Gallery saved successfully');
    } else {
      setError((res as any)?.error || 'Error updating gallery');
    }
    setLoading(false);
  };

  const handleAddImage = async () => {
    if (!newImageUrl) return alert('Upload an image first');
    setLoading(true);
    const res = await addGalleryImageAction({ galleryId: gal.id, url: newImageUrl, altText: newImageAlt, caption: newImageCaption });
    if (res?.success) {
      setNewImageUrl('');
      setNewImageAlt('');
      setNewImageCaption('');
      router.refresh();
    } else {
      alert((res as any)?.error || 'Error adding image');
    }
    setLoading(false);
  };

  const handleRemoveImage = async (imageId: string) => {
    if (!confirm('Remove this image?')) return;
    setLoading(true);
    const res = await deleteGalleryImageAction({ id: imageId });
    if (res?.success) router.refresh();
    else alert((res as any)?.error || 'Error removing image');
    setLoading(false);
  };

  const handleReorder = async (imageId: string, direction: 'UP' | 'DOWN') => {
    setLoading(true);
    const res = await reorderGalleryImageAction({ id: imageId, direction });
    if (res?.success) router.refresh();
    else alert((res as any)?.error || 'Error reordering image');
    setLoading(false);
  };

  return (
    <div className="py-10 px-4 sm:px-6 lg:px-8 max-w-[1000px] mx-auto">
      <h1 className="text-3xl font-extrabold text-navy dark:text-white mb-6">Edit Gallery</h1>

      {error && <div className="p-4 bg-red-50 text-red-600 mb-6 rounded-lg">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-6 bg-white dark:bg-zinc-900 p-6 rounded-xl border border-black/5 dark:border-white/5 shadow-sm mb-10">
        <h2 className="text-xl font-bold mb-4">Gallery Details</h2>
        <div><label htmlFor="gallery-title" className="block text-sm font-bold mb-2">Title</label><input id="gallery-title" required value={title} onChange={e => setTitle(e.target.value)} className="w-full border p-3 rounded-xl" /></div>
        <div><label htmlFor="gallery-description" className="block text-sm font-bold mb-2">Description</label><textarea id="gallery-description" value={description} onChange={e => setDescription(e.target.value)} className="w-full border p-3 rounded-xl h-24" /></div>
        <div><label htmlFor="gallery-status" className="block text-sm font-bold mb-2">Status</label><select id="gallery-status" value={status} onChange={e => setStatus(e.target.value as any)} className="w-full border p-3 rounded-xl"><option value="DRAFT">Draft</option><option value="PUBLISHED">Published</option><option value="ARCHIVED">Archived</option></select></div>
        <button type="submit" disabled={loading} className="bg-accent text-white px-6 py-3 rounded-xl font-bold">{loading ? 'Saving...' : 'Save Gallery Details'}</button>
      </form>

      <div className="space-y-6 bg-white dark:bg-zinc-900 p-6 rounded-xl border border-black/5 dark:border-white/5 shadow-sm mb-10">
        <h2 className="text-xl font-bold mb-4">Gallery Images</h2>

        {gal.images.length === 0 ? (
          <p className="text-text-secondary">No images added yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {gal.images.map((img: any) => (
              <div key={img.id} className="border p-4 rounded-xl flex flex-col gap-2 relative group">
                <img src={img.url} className="w-full h-40 object-cover rounded-lg" alt={img.altText || ''} loading="lazy" decoding="async" />
                <p className="text-sm font-bold mt-2 truncate">{img.caption || 'No caption'}</p>
                <div className="flex justify-between mt-2">
                  <div className="flex gap-2">
                    <button onClick={() => handleReorder(img.id, 'UP')} disabled={loading} className="p-2.5 border rounded min-h-[44px] min-w-[44px] flex items-center justify-center hover:bg-slate-50"><ArrowUp size={16} /></button>
                    <button onClick={() => handleReorder(img.id, 'DOWN')} disabled={loading} className="p-2.5 border rounded min-h-[44px] min-w-[44px] flex items-center justify-center hover:bg-slate-50"><ArrowDown size={16} /></button>
                  </div>
                  <button onClick={() => handleRemoveImage(img.id)} disabled={loading} className="p-2 border border-red-200 text-red-600 rounded hover:bg-red-50"><Trash2 size={16} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-6 bg-white dark:bg-zinc-900 p-6 rounded-xl border border-black/5 dark:border-white/5 shadow-sm">
        <h2 className="text-xl font-bold mb-4">Add New Image</h2>
        <ImageUpload value={newImageUrl} onChange={setNewImageUrl} type="GALLERY" label="Upload Image" />
        {newImageUrl && (
          <>
            <div><label htmlFor="gallery-alt-text" className="block text-sm font-bold mb-2">Alt Text</label><input id="gallery-alt-text" value={newImageAlt} onChange={e => setNewImageAlt(e.target.value)} className="w-full border p-3 rounded-xl" /></div>
            <div><label htmlFor="gallery-caption" className="block text-sm font-bold mb-2">Caption</label><input id="gallery-caption" value={newImageCaption} onChange={e => setNewImageCaption(e.target.value)} className="w-full border p-3 rounded-xl" /></div>
            <button onClick={handleAddImage} disabled={loading} className="bg-green-600 text-white px-6 py-3 rounded-xl font-bold">{loading ? 'Adding...' : 'Add Image to Gallery'}</button>
          </>
        )}
      </div>
    </div>
  );
}
