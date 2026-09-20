import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import PostDetail from '@/components/posts/PostDetail';

export const revalidate = 60;

export default async function FactDetailPage({ params }: { params: { id: string } }) {
  const post = await prisma.post.findUnique({
    where: { id: params.id, type: 'FACT', isPublished: true },
    include: { author: { select: { email: true } } }
  });

  if (!post) {
    notFound();
  }

  return <PostDetail post={post} backUrl="/historical-facts" backLabel="Historical Facts" />;
}
