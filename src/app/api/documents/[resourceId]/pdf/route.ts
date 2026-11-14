import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getCurrentUser } from '@/lib/api-auth';
import { prisma } from '@/lib/prisma';
import { s3Client } from '@/lib/b2';
import { env } from '@/env';
import { rateLimit } from '@/lib/rate-limit';
import { getClientIp } from '@/lib/client-ip';
import { canAccessResource } from '@/modules/entitlements/entitlement.service';

/**
 * Same-origin PDF streamer for the secure reader.
 *
 * pdf.js fetches the document from the browser, so the previous presigned B2
 * URL needed a CORS rule on the bucket; without it every PDF failed with the
 * generic "may have expired" error. Streaming the bytes through our own origin
 * removes the CORS dependency and the 5-minute URL expiry at the same time.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ resourceId: string }> }
) {
  try {
    const { resourceId } = await params;
    const user = await getCurrentUser();
    if (!user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(resourceId)) {
      return new NextResponse('Invalid resource ID', { status: 400 });
    }

    // Same abuse limits as the previous document-url action.
    const headersList = await headers();
    const ip = getClientIp(headersList);
    const ipLimit = await rateLimit(`doc_abuse_${ip}`, 10, 60);
    if (!ipLimit.success) {
      return new NextResponse('Too many requests. Please try again later.', { status: 429 });
    }
    const scopedLimit = await rateLimit(`doc_access:${user.id}:${resourceId}`, 5, 60);
    if (!scopedLimit.success) {
      return new NextResponse('Too many requests for this document. Please wait a moment.', { status: 429 });
    }

    const resource = await prisma.resource.findUnique({
      where: { id: resourceId },
      include: { document: true },
    });
    if (!resource || resource.status !== 'PUBLISHED' || !resource.document) {
      return new NextResponse('Resource not found', { status: 404 });
    }

    if (!(await canAccessResource(user.id, resourceId))) {
      return new NextResponse('You do not have access to this resource.', { status: 403 });
    }

    const object = await s3Client.send(
      new GetObjectCommand({
        Bucket: env.B2_BUCKET_NAME || '',
        Key: resource.document.storageKey,
      })
    );
    if (!object.Body) {
      return new NextResponse('Document unavailable', { status: 502 });
    }

    await prisma.accessLog.create({
      data: {
        userId: user.id,
        resourceId,
        documentId: resource.document.id,
        action: 'VIEW_DOCUMENT',
        ipAddress: ip,
        userAgent: headersList.get('user-agent') ?? 'unknown',
      },
    });

    const filename =
      `${resource.title.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'document'}.pdf`;
    return new NextResponse(object.Body as unknown as ReadableStream, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${filename}"`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (error) {
    console.error('Error streaming resource PDF:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
