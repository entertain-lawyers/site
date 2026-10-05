import os

list_gallery = """import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import DeleteGalleryButton from './DeleteGalleryButton';

export default async function AdminGalleryPage() {
  const session = await auth();
  if (!session?.user?.id || (session.user.role !== 'ADMIN' && session.user.role !== 'EDITOR')) {
    redirect('/');
  }

  const galleries = await prisma.gallery.findMany({
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { images: true } } }
  });

  return (
    <div className="py-10 px-4 sm:px-6 lg:px-8 max-w-[1400px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-10 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-navy dark:text-white tracking-tight">Galleries</h1>
          <p className="mt-2 text-text-secondary font-medium">Manage image galleries.</p>
        </div>
        <div className="flex-shrink-0">
          <Link href="/admin/gallery/new" className="inline-flex items-center justify-center px-6 py-2.5 border border-transparent shadow-sm text-sm font-bold rounded-xl text-white bg-accent hover:bg-accent/90 transition-all duration-300 hover:-translate-y-0.5">
            Create Gallery
          </Link>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-sm border border-black/5 dark:border-white/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-black/5 dark:divide-white/5">
          <thead className="bg-slate-50/80 dark:bg-zinc-900/80 backdrop-blur-md">
            <tr>
              <th className="px-8 py-4 text-left text-xs font-bold text-text-muted uppercase tracking-wider">Title</th>
              <th className="px-8 py-4 text-left text-xs font-bold text-text-muted uppercase tracking-wider">Images</th>
              <th className="px-8 py-4 text-left text-xs font-bold text-text-muted uppercase tracking-wider">Status</th>
              <th className="px-8 py-4 text-right text-xs font-bold text-text-muted uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-zinc-900 divide-y divide-black/5 dark:divide-white/5">
            {galleries.length > 0 ? (
              galleries.map((gal) => (
                <tr key={gal.id} className="hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors group">
                  <td className="px-8 py-5 whitespace-nowrap text-sm font-bold text-navy dark:text-white">{gal.title}</td>
                  <td className="px-8 py-5 whitespace-nowrap text-sm font-medium text-text-secondary">{gal._count.images} images</td>
                  <td className="px-8 py-5 whitespace-nowrap text-sm">
                    <span className={`px-3 py-1 inline-flex text-xs font-bold rounded-full border ${gal.status === 'PUBLISHED' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                      {gal.status === 'PUBLISHED' ? 'Published' : 'Draft'}
                    </span>
                  </td>
                  <td className="px-8 py-5 whitespace-nowrap text-right text-sm font-medium flex justify-end gap-2">
                    <Link href={`/admin/gallery/${gal.id}/edit`} className="inline-flex items-center justify-center px-4 py-2 border border-black/5 dark:border-white/5 rounded-lg text-navy dark:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors shadow-sm">Edit</Link>
                    <DeleteGalleryButton id={gal.id} />
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="px-8 py-16 text-center">
                  <p className="text-sm text-text-secondary">No galleries found.</p>
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

delete_gallery = """'use client';
import { useState } from 'react';
import { deleteGalleryAction } from '@/modules/admin/admin-gallery.actions';

export default function DeleteGalleryButton({ id }: { id: string }) {
  const [loading, setLoading] = useState(false);
  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this gallery and ALL its images?')) return;
    setLoading(true);
    const res = await deleteGalleryAction({ id });
    if (!res?.success) alert((res as any)?.error || 'Error deleting gallery');
    setLoading(false);
  };
  return (
    <button onClick={handleDelete} disabled={loading} className="inline-flex items-center justify-center px-4 py-2 border border-red-200 rounded-lg text-red-600 hover:bg-red-50 transition-colors shadow-sm disabled:opacity-50">
      Delete
    </button>
  );
}
"""

new_gallery = """'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createGalleryAction } from '@/modules/admin/admin-gallery.actions';

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
        <div><label className="block text-sm font-bold mb-2">Title</label><input required value={title} onChange={e => setTitle(e.target.value)} className="w-full border p-3 rounded-xl" /></div>
        <div><label className="block text-sm font-bold mb-2">Description</label><textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full border p-3 rounded-xl h-24" /></div>
        <div><label className="block text-sm font-bold mb-2">Status</label><select value={status} onChange={e => setStatus(e.target.value as any)} className="w-full border p-3 rounded-xl"><option value="DRAFT">Draft</option><option value="PUBLISHED">Published</option><option value="ARCHIVED">Archived</option></select></div>
        <button type="submit" disabled={loading} className="bg-accent text-white px-6 py-3 rounded-xl font-bold">{loading ? 'Saving...' : 'Save & Continue to Images'}</button>
      </form>
    </div>
  );
}
"""

edit_gallery = """import { prisma } from '@/lib/prisma';
import EditGalleryClient from './EditGalleryClient';
import { notFound } from 'next/navigation';

export default async function EditGalleryPage({ params }: { params: Promise<{ id: string }> }) {
  const id = (await params).id;
  const gal = await prisma.gallery.findUnique({ 
    where: { id },
    include: { images: { orderBy: { order: 'asc' } } }
  });
  if (!gal) notFound();
  return <EditGalleryClient gal={gal} />;
}
"""

edit_gallery_client = """'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateGalleryAction, addGalleryImageAction, removeGalleryImageAction, reorderGalleryImageAction } from '@/modules/admin/admin-gallery.actions';
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
    const res = await removeGalleryImageAction({ id: imageId });
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
        <div><label className="block text-sm font-bold mb-2">Title</label><input required value={title} onChange={e => setTitle(e.target.value)} className="w-full border p-3 rounded-xl" /></div>
        <div><label className="block text-sm font-bold mb-2">Description</label><textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full border p-3 rounded-xl h-24" /></div>
        <div><label className="block text-sm font-bold mb-2">Status</label><select value={status} onChange={e => setStatus(e.target.value as any)} className="w-full border p-3 rounded-xl"><option value="DRAFT">Draft</option><option value="PUBLISHED">Published</option><option value="ARCHIVED">Archived</option></select></div>
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
                <img src={img.url} className="w-full h-40 object-cover rounded-lg" alt={img.altText || ''} />
                <p className="text-sm font-bold mt-2 truncate">{img.caption || 'No caption'}</p>
                <div className="flex justify-between mt-2">
                  <div className="flex gap-2">
                    <button onClick={() => handleReorder(img.id, 'UP')} disabled={loading} className="p-2 border rounded hover:bg-slate-50"><ArrowUp size={16} /></button>
                    <button onClick={() => handleReorder(img.id, 'DOWN')} disabled={loading} className="p-2 border rounded hover:bg-slate-50"><ArrowDown size={16} /></button>
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
            <div><label className="block text-sm font-bold mb-2">Alt Text</label><input value={newImageAlt} onChange={e => setNewImageAlt(e.target.value)} className="w-full border p-3 rounded-xl" /></div>
            <div><label className="block text-sm font-bold mb-2">Caption</label><input value={newImageCaption} onChange={e => setNewImageCaption(e.target.value)} className="w-full border p-3 rounded-xl" /></div>
            <button onClick={handleAddImage} disabled={loading} className="bg-green-600 text-white px-6 py-3 rounded-xl font-bold">{loading ? 'Adding...' : 'Add Image to Gallery'}</button>
          </>
        )}
      </div>
    </div>
  );
}
"""

with open('src/app/admin/gallery/page.tsx', 'w') as f: f.write(list_gallery)
with open('src/app/admin/gallery/DeleteGalleryButton.tsx', 'w') as f: f.write(delete_gallery)
with open('src/app/admin/gallery/new/page.tsx', 'w') as f: f.write(new_gallery)
with open('src/app/admin/gallery/[id]/edit/page.tsx', 'w') as f: f.write(edit_gallery)
with open('src/app/admin/gallery/[id]/edit/EditGalleryClient.tsx', 'w') as f: f.write(edit_gallery_client)

print("Generated Gallery UI")
