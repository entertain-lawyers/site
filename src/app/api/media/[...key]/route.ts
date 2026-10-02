import { NextRequest, NextResponse } from 'next/server';
import { generatePresignedGetUrl } from '@/lib/b2';

// Explicit allowlist of public prefixes.
// We strictly reject any prefix related to paid or private documents (e.g., 'documents/').
const PUBLIC_PREFIXES = ['editorial/', 'gallery/', 'publications/'];

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ key: string[] }> }
) {
  try {
    const { key: keyArray } = await params;

    if (!keyArray || keyArray.length === 0) {
      return new NextResponse('Invalid request', { status: 400 });
    }

    // 0. Security Check: Prevent path traversal
    if (keyArray.some(segment => segment === '..' || segment === '.')) {
      return new NextResponse('Forbidden: Path traversal not allowed', { status: 403 });
    }

    const key = keyArray.join('/');

    // 1. Security Check: Validate against public prefix allowlist
    const isPublic = PUBLIC_PREFIXES.some(prefix => key.startsWith(prefix));

    if (!isPublic) {
      // Return 403 for blocked/private prefixes (like documents/) or unknown prefixes
      return new NextResponse('Forbidden: Prefix not authorized for public access', { status: 403 });
    }

    // 2. Generate a short-lived presigned URL (3600 seconds = 1 hour)
    const presignedUrl = await generatePresignedGetUrl(key, 3600);

    // 3. Issue a 302 Redirect with strict Cache-Control headers
    // We cache the redirect for 1800 seconds (30 mins), safely less than the 60 min signature.
    return NextResponse.redirect(presignedUrl, {
      status: 302,
      headers: {
        'Cache-Control': 'public, max-age=1800, s-maxage=1800, stale-while-revalidate=86400'
      }
    });

  } catch (error) {
    console.error('Error serving public media:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
