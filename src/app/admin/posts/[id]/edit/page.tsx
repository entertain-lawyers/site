import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import EditPostClient from './EditPostClient';
import { Role } from '@prisma/client';

export default async function EditPostPage({ params }: { params: { id: string } }) {
  const session = await auth();

  if (!session?.user?.id || (session.user.role !== Role.ADMIN && session.user.role !== Role.EDITOR)) {
    redirect('/');
  }

  const post = await prisma.post.findUnique({
    where: { id: params.id }
  });

  if (!post) {
    redirect('/admin/posts');
  }

  if (session.user.role === Role.EDITOR && post.authorId !== session.user.id) {
    redirect('/admin/posts');
  }

  return (
    <div className="min-h-screen bg-transparent">
      <EditPostClient post={post} />
    </div>
  );
}
