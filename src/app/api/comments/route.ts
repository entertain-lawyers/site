import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/api-auth';
import { getClientIp } from '@/lib/client-ip';
import { rateLimit } from '@/lib/rate-limit';
import {
  createComment,
  isPostType,
  listComments,
  normalizeCommentBody,
  normalizePostId,
} from '@/lib/comments';

export const dynamic = 'force-dynamic';
export const maxDuration = 15;

/** GET /api/comments?postId=2600&type=NEWS — public read. */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const postId = normalizePostId(searchParams.get('postId'));
  const postType = searchParams.get('type') ?? 'NEWS';

  if (!postId || !isPostType(postType)) {
    return NextResponse.json({ error: 'Invalid post' }, { status: 400 });
  }

  // Resolve the role from the database; the JWT can hold a stale role.
  const user = await getCurrentUser();
  const viewer = user ? { id: user.id, role: user.role } : undefined;

  try {
    const comments = await listComments(postId, postType, viewer);
    return NextResponse.json({ comments });
  } catch (error) {
    console.error('[comments] list failed:', error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: 'Comments are unavailable right now. Please try again shortly.' },
      { status: 503 }
    );
  }
}

/** POST /api/comments — requires a signed-in user. */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { error: 'signin_required', message: 'Please sign in to comment.' },
      { status: 401 }
    );
  }

  // Fail-open: a limiter outage must not stop genuine commenters; the
  // per-user auth requirement already bounds abuse far better than IP caps.
  try {
    const perMinute = await rateLimit(`comment-min:${getClientIp(request.headers)}`, 5, 60);
    if (!perMinute.success) {
      return NextResponse.json(
        { error: 'rate_limited', message: 'You are commenting too quickly. Please wait a minute.' },
        { status: 429 }
      );
    }
  } catch {
    // limiter unavailable → allow
  }

  const body = (await request.json().catch(() => ({}))) as {
    postId?: unknown;
    type?: unknown;
    content?: unknown;
  };

  const postId = normalizePostId(body.postId);
  const content = normalizeCommentBody(body.content);
  const postType = body.type ?? 'NEWS';

  if (!postId || !isPostType(postType)) {
    return NextResponse.json({ error: 'Invalid post' }, { status: 400 });
  }
  if (!content) {
    return NextResponse.json(
      { error: 'empty', message: 'Write something before posting.' },
      { status: 400 }
    );
  }

  try {
    const comment = await createComment({
      postId,
      postType,
      userId: user.id,
      content,
    });
    return NextResponse.json({ comment }, { status: 201 });
  } catch (error) {
    console.error('[comments] create failed:', error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: 'Could not post your comment. Please try again.' },
      { status: 500 }
    );
  }
}
