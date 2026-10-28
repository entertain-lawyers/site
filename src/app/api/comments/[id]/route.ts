import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/api-auth';
import { deleteComment } from '@/lib/comments';

export const dynamic = 'force-dynamic';

/** DELETE /api/comments/[id] — the author or an admin only. */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // Re-read the role from the database: the JWT can still claim ADMIN after a
  // demotion, which would let the caller delete other users' comments.
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'signin_required' }, { status: 401 });
  }

  const { id } = await params;
  if (!id || id.length > 64) {
    return NextResponse.json({ error: 'Invalid comment' }, { status: 400 });
  }

  try {
    const removed = await deleteComment(id, { id: user.id, role: user.role });
    if (!removed) {
      return NextResponse.json({ error: 'Not found or not allowed' }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[comments] delete failed:', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'Could not delete the comment.' }, { status: 500 });
  }
}
