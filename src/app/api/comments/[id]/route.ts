import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { deleteComment } from '@/lib/comments';

export const dynamic = 'force-dynamic';

/** DELETE /api/comments/[id] — the author or an admin only. */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'signin_required' }, { status: 401 });
  }

  const { id } = await params;
  if (!id || id.length > 64) {
    return NextResponse.json({ error: 'Invalid comment' }, { status: 400 });
  }

  try {
    const removed = await deleteComment(id, { id: session.user.id, role: session.user.role });
    if (!removed) {
      return NextResponse.json({ error: 'Not found or not allowed' }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[comments] delete failed:', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'Could not delete the comment.' }, { status: 500 });
  }
}
