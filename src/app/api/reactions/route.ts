import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getReactions, toggleReaction, REACTION_TYPES, type ReactionType } from '@/lib/reactions';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const postId = searchParams.get('postId');
  const postType = searchParams.get('type') || 'NEWS';
  const anonId = searchParams.get('anonId');

  if (!postId) {
    return NextResponse.json({ error: 'postId is required' }, { status: 400 });
  }

  const session = await auth();
  const userId = session?.user?.id || anonId;

  const data = await getReactions(postId, postType, userId);
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { postId, postType = 'NEWS', reaction, anonId } = body;

    if (!postId || !reaction) {
      return NextResponse.json({ error: 'postId and reaction are required' }, { status: 400 });
    }

    if (!REACTION_TYPES.includes(reaction as ReactionType)) {
      return NextResponse.json({ error: 'Invalid reaction type' }, { status: 400 });
    }

    const session = await auth();
    const userId = session?.user?.id || anonId;

    if (!userId) {
      return NextResponse.json({ error: 'User identifier is required' }, { status: 400 });
    }

    const data = await toggleReaction(postId, postType, userId, reaction as ReactionType);
    return NextResponse.json(data);
  } catch (error) {
    console.error('[api/reactions] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
