import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generatePresignedGetUrl } from '@/lib/b2';
import { isFetchableUrl } from '@/lib/url-validation';

/**
 * Same-origin PDF streamer for the acts reader modal.
 *
 * Backblaze B2 serves its presigned file URLs with headers that stop browsers
 * from embedding them cross-origin in an <iframe> ("This content is blocked"),
 * and most external gazette sites send X-Frame-Options/CSP that block framing
 * too. This route proxies the document bytes through our own origin so the
 * modal's iframe can always display them.
 */

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const act = await prisma.actLaw.findUnique({
      where: { id },
      select: { title: true, documentUrl: true },
    });

    if (!act?.documentUrl) {
      return new NextResponse('Document not found', { status: 404 });
    }

    const url = act.documentUrl;
    let upstream: Response | null = null;

    if (url.startsWith('/api/media/')) {
      // Uploaded document: resolve the storage key and fetch the B2 file.
      const key = url.replace(/^\/api\/media\//, '');
      const isPublic = ['editorial/', 'gallery/', 'publications/'].some(
        (prefix) => key.startsWith(prefix) && key.length > prefix.length
      );
      if (!isPublic) return new NextResponse('Forbidden', { status: 403 });

      const presigned = await generatePresignedGetUrl(key, 3600);
      upstream = await fetch(presigned);
    } else {
      const parsed = new URL(url);
      if (!isFetchableUrl(parsed)) return new NextResponse('Forbidden', { status: 403 });
      upstream = await fetch(parsed, { redirect: 'follow' });
    }

    if (!upstream.ok || !upstream.body) {
      return new NextResponse('Upstream document unavailable', { status: 502 });
    }

    const filename = `${act.title.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'document'}.pdf`;
    return new NextResponse(upstream.body, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${filename}"`,
        'Cache-Control': 'private, max-age=300',
      },
    });
  } catch (error) {
    console.error('Error streaming act PDF:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
