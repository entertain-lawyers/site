import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import PostDetail from '@/components/posts/PostDetail';

export const revalidate = 60;

export default async function FactDetailPage({ params }: { params: { id: string } }) {
  const post = await prisma.post.findUnique({
    where: { id: params.id, type: 'FACT', status: 'PUBLISHED' },
    include: { author: { select: { email: true } } }
  });

  if (!post) {
    notFound();
  }

  return <PostDetail post={{...post, author: post.author || { email: 'Unknown' }}} backUrl="/historical-facts" backLabel="Historical Facts" />;
}
