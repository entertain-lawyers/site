import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { Role } from '@prisma/client';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || (session.user.role !== Role.ADMIN && session.user.role !== Role.EDITOR)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const imageUrl = searchParams.get('url');

  if (!imageUrl) {
    return NextResponse.json({ error: 'Image URL is required' }, { status: 400 });
  }

  try {
    const parsed = new URL(imageUrl);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return NextResponse.json({ error: 'Invalid URL protocol' }, { status: 400 });
    }

    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'EntertainLawyers-MediaProxy/1.0',
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Upstream returned status ${response.status}` },
        { status: response.status }
      );
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const buffer = await response.arrayBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err) {
    console.error('[image-proxy] Fetch error:', err);
    return NextResponse.json({ error: 'Failed to proxy image' }, { status: 500 });
  }
}
