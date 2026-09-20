import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import Link from 'next/link';

export default async function NewPostPage() {
  const session = await auth();

  if (!session?.user?.id || (session.user.role !== 'ADMIN' && session.user.role !== 'EDITOR')) {
    redirect('/');
  }

  async function createPost(formData: FormData) {
    'use server';
    const session = await auth();
    if (!session?.user?.id || (session.user.role !== 'ADMIN' && session.user.role !== 'EDITOR')) {
      throw new Error('Unauthorized');
    }

    const title = formData.get('title') as string;
    const content = formData.get('content') as string;
    const type = formData.get('type') as 'NEWS' | 'BLOG' | 'FACT';
    const isPublished = formData.get('isPublished') === 'on';

    await prisma.post.create({
      data: {
        title,
        content,
        type,
        isPublished,
        authorId: session.user.id,
      }
    });

    revalidatePath('/admin/posts');
    redirect('/admin/posts');
  }

  return (
    <div className="py-10 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <Link href="/admin/posts" className="text-accent hover:underline mb-4 inline-block">&larr; Back to Posts</Link>
        <h1 className="text-2xl font-bold text-navy dark:text-white">Create New Post</h1>
      </div>

      <form action={createPost} className="bg-surface shadow-soft border border-border rounded-xl p-6 sm:p-8 space-y-6">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-navy dark:text-white">Title</label>
          <input
            type="text"
            name="title"
            id="title"
            required
            className="mt-1 block w-full rounded-md border-border bg-background px-3 py-2 text-navy dark:text-white shadow-sm focus:border-accent focus:ring-accent sm:text-sm"
          />
        </div>

        <div>
          <label htmlFor="type" className="block text-sm font-medium text-navy dark:text-white">Type</label>
          <select
            name="type"
            id="type"
            required
            className="mt-1 block w-full rounded-md border-border bg-background px-3 py-2 text-navy dark:text-white shadow-sm focus:border-accent focus:ring-accent sm:text-sm"
          >
            <option value="NEWS">News</option>
            <option value="BLOG">Blog</option>
            <option value="FACT">Fact</option>
          </select>
        </div>

        <div>
          <label htmlFor="content" className="block text-sm font-medium text-navy dark:text-white">Content (Markdown supported)</label>
          <textarea
            name="content"
            id="content"
            rows={10}
            required
            className="mt-1 block w-full rounded-md border-border bg-background px-3 py-2 text-navy dark:text-white shadow-sm focus:border-accent focus:ring-accent sm:text-sm font-mono"
          ></textarea>
        </div>

        <div className="flex items-center">
          <input
            id="isPublished"
            name="isPublished"
            type="checkbox"
            className="h-4 w-4 rounded border-border text-accent focus:ring-accent"
          />
          <label htmlFor="isPublished" className="ml-2 block text-sm text-navy dark:text-white">
            Publish immediately
          </label>
        </div>

        <div className="flex justify-end pt-4">
          <button
            type="submit"
            className="inline-flex justify-center rounded-md border border-transparent bg-accent py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
          >
            Create Post
          </button>
        </div>
      </form>
    </div>
  );
}
