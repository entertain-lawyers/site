import os

list_pubs = """import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import DeletePubButton from './DeletePubButton';

export default async function AdminPublicationsPage() {
  const session = await auth();
  if (!session?.user?.id || (session.user.role !== 'ADMIN' && session.user.role !== 'EDITOR')) {
    redirect('/');
  }

  const pubs = await prisma.publication.findMany({
    orderBy: { publishDate: 'desc' },
    include: { author: { select: { email: true } }, document: true }
  });

  return (
    <div className="py-10 px-4 sm:px-6 lg:px-8 max-w-[1400px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-10 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-navy dark:text-white tracking-tight">Publications</h1>
          <p className="mt-2 text-text-secondary font-medium">Manage publications and reports.</p>
        </div>
        <div className="flex-shrink-0">
          <Link href="/admin/publications/new" className="inline-flex items-center justify-center px-6 py-2.5 border border-transparent shadow-sm text-sm font-bold rounded-xl text-white bg-accent hover:bg-accent/90 transition-all duration-300 hover:-translate-y-0.5">
            Create Publication
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
              <th className="px-8 py-4 text-left text-xs font-bold text-text-muted uppercase tracking-wider">Document</th>
              <th className="px-8 py-4 text-right text-xs font-bold text-text-muted uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-zinc-900 divide-y divide-black/5 dark:divide-white/5">
            {pubs.length > 0 ? (
              pubs.map((pub) => (
                <tr key={pub.id} className="hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors group">
                  <td className="px-8 py-5 whitespace-nowrap text-sm font-bold text-navy dark:text-white">{pub.title}</td>
                  <td className="px-8 py-5 whitespace-nowrap text-sm font-medium text-text-secondary">{pub.publishDate?.toLocaleDateString()}</td>
                  <td className="px-8 py-5 whitespace-nowrap text-sm">
                    <span className={`px-3 py-1 inline-flex text-xs font-bold rounded-full border ${pub.status === 'PUBLISHED' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                      {pub.status === 'PUBLISHED' ? 'Published' : 'Draft'}
                    </span>
                  </td>
                  <td className="px-8 py-5 whitespace-nowrap text-sm font-medium text-text-secondary">
                    {pub.documentId ? <span className="text-blue-600 font-bold">Secure PDF</span> : pub.documentUrl ? <span className="text-green-600 font-bold">Public URL</span> : 'None'}
                  </td>
                  <td className="px-8 py-5 whitespace-nowrap text-right text-sm font-medium flex justify-end gap-2">
                    <Link href={`/admin/publications/${pub.id}/edit`} className="inline-flex items-center justify-center px-4 py-2 border border-black/5 dark:border-white/5 rounded-lg text-navy dark:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors shadow-sm">Edit</Link>
                    <DeletePubButton id={pub.id} />
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-8 py-16 text-center">
                  <p className="text-sm text-text-secondary">No publications found.</p>
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

delete_pub = """'use client';
import { useState } from 'react';
import { deletePublicationAction } from '@/modules/admin/admin-publication.actions';

export default function DeletePubButton({ id }: { id: string }) {
  const [loading, setLoading] = useState(false);
  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this publication?')) return;
    setLoading(true);
    const res = await deletePublicationAction({ id });
    if (!res?.success) alert((res as any)?.error || 'Error deleting publication. It might have a secure document attached.');
    setLoading(false);
  };
  return (
    <button onClick={handleDelete} disabled={loading} className="inline-flex items-center justify-center px-4 py-2 border border-red-200 rounded-lg text-red-600 hover:bg-red-50 transition-colors shadow-sm disabled:opacity-50">
      Delete
    </button>
  );
}
"""

new_pub = """'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createPublicationAction } from '@/modules/admin/admin-publication.actions';
import RichTextEditor from '@/components/editor/RichTextEditor';
import ImageUpload from '@/components/admin/ImageUpload';

export default function NewPubPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');
  const [publishDate, setPublishDate] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [documentUrl, setDocumentUrl] = useState('');
  const [status, setStatus] = useState<'DRAFT'|'PUBLISHED'|'ARCHIVED'>('DRAFT');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    const res = await createPublicationAction({
      title, slug, description, content, publishDate: publishDate || undefined, coverImage, documentUrl, status
    });

    if (res?.success) {
      router.push('/admin/publications');
      router.refresh();
    } else {
      setError((res as any)?.error || 'Error creating publication');
      setLoading(false);
    }
  };

  return (
    <div className="py-10 px-4 sm:px-6 lg:px-8 max-w-[1000px] mx-auto">
      <h1 className="text-3xl font-extrabold text-navy dark:text-white mb-6">Create Publication</h1>
      
      <div className="bg-blue-50 border border-blue-200 text-blue-800 p-4 rounded-xl mb-6 text-sm font-medium">
        <strong>Note on Secure Documents:</strong> Uploading secure private documents requires the dedicated Private Study Document workflow. This form only allows setting a public document URL.
      </div>

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
"""

edit_pub = """import { prisma } from '@/lib/prisma';
import EditPubClient from './EditPubClient';
import { notFound } from 'next/navigation';

export default async function EditPubPage({ params }: { params: Promise<{ id: string }> }) {
  const id = (await params).id;
  const pub = await prisma.publication.findUnique({ where: { id } });
  if (!pub) notFound();
  return <EditPubClient pub={pub} />;
}
"""

edit_pub_client = """'use client';
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
"""

with open('src/app/admin/publications/page.tsx', 'w') as f: f.write(list_pubs)
with open('src/app/admin/publications/DeletePubButton.tsx', 'w') as f: f.write(delete_pub)
with open('src/app/admin/publications/new/page.tsx', 'w') as f: f.write(new_pub)
with open('src/app/admin/publications/[id]/edit/page.tsx', 'w') as f: f.write(edit_pub)
with open('src/app/admin/publications/[id]/edit/EditPubClient.tsx', 'w') as f: f.write(edit_pub_client)

print("Generated Publications UI")
