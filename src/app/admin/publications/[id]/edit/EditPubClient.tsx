'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updatePublicationAction } from '@/modules/admin/admin-publication.actions';
import RichTextEditor from '@/components/editor/RichTextEditor';
import ImageUpload from '@/components/admin/ImageUpload';

export default function EditPubClient({ pub }: { pub: any }) {
  const router = useRouter();
  const [title, setTitle] = useState(pub.title);
  const [slug, setSlug] = useState(pub.slug);
  const [description, setDescription] = useState(pub.description || '');
  const [content, setContent] = useState(pub.content || '');

  const [publishDate, setPublishDate] = useState(pub.publishDate ? pub.publishDate.toISOString().split('T')[0] : '');
  const [coverImage, setCoverImage] = useState(pub.coverImage || '');
  const [documentUrl, setDocumentUrl] = useState(pub.documentUrl || '');
  const [status, setStatus] = useState<'DRAFT'|'PUBLISHED'|'ARCHIVED'>(pub.status);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const res = await updatePublicationAction({
      id: pub.id, title, slug, description, content, publishDate: publishDate || undefined, coverImage, documentUrl, status
    });

    if (res?.success) {
      router.push('/admin/publications');
      router.refresh();
    } else {
      setError((res as any)?.error || 'Error updating publication');
      setLoading(false);
    }
  };

  return (
    <div className="py-10 px-4 sm:px-6 lg:px-8 max-w-[1000px] mx-auto">
      <h1 className="text-3xl font-extrabold text-navy dark:text-white mb-6">Edit Publication</h1>

      {pub.documentId && (
        <div className="bg-green-50 border border-green-200 text-green-800 p-4 rounded-xl mb-6 text-sm font-medium">
          <strong>Secure Document Attached:</strong> This publication is linked to a private Study Document (ID: {pub.documentId}). This relation is protected by Prisma and cannot be detached via this UI.
        </div>
      )}

      {error && <div className="p-4 bg-red-50 text-red-600 mb-6 rounded-lg">{error}</div>}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div><label className="block text-sm font-bold mb-2">Title</label><input required value={title} onChange={e => setTitle(e.target.value)} className="w-full border p-3 rounded-xl" /></div>
        <div><label className="block text-sm font-bold mb-2">Slug</label><input required pattern="^[a-z0-9-]+$" value={slug} onChange={e => setSlug(e.target.value)} className="w-full border p-3 rounded-xl" /></div>
        <div><label className="block text-sm font-bold mb-2">Description</label><textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full border p-3 rounded-xl h-24" /></div>
        <div><label className="block text-sm font-bold mb-2">Publish Date</label><input type="date" value={publishDate} onChange={e => setPublishDate(e.target.value)} className="w-full border p-3 rounded-xl" /></div>
        <div><label className="block text-sm font-bold mb-2">Status</label><select value={status} onChange={e => setStatus(e.target.value as any)} className="w-full border p-3 rounded-xl"><option value="DRAFT">Draft</option><option value="PUBLISHED">Published</option><option value="ARCHIVED">Archived</option></select></div>
        <div><label className="block text-sm font-bold mb-2">Public Document URL (Optional)</label><input type="url" value={documentUrl} onChange={e => setDocumentUrl(e.target.value)} className="w-full border p-3 rounded-xl" placeholder="https://..." /></div>
        <ImageUpload value={coverImage} onChange={setCoverImage} type="PUBLICATION" label="Cover Image" />
        <div><label className="block text-sm font-bold mb-2">Content</label><RichTextEditor value={content} onChange={setContent} /></div>
        <button type="submit" disabled={loading} className="bg-accent text-white px-6 py-3 rounded-xl font-bold">{loading ? 'Saving...' : 'Save Publication'}</button>
      </form>
    </div>
  );
}
