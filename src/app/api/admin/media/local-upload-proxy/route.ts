import { NextResponse } from 'next/server';
import { env } from '@/env';
import fs from 'fs';
import path from 'path';
import { auth } from '@/lib/auth';
import { localUploadIntents } from '@/lib/storage/local';

export async function PUT(request: Request) {
  // STRICT DEVELOPMENT-ONLY ENFORCEMENT
  if (env.NODE_ENV === 'production') {
    return new NextResponse('Not available in production. Use R2.', { status: 403 });
  }

  // AUTHENTICATION & AUTHORIZATION
  const session = await auth();
  if (!session || !session.user || (session.user.role !== 'ADMIN' && session.user.role !== 'EDITOR')) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');
  if (!token) return new NextResponse('Missing upload token', { status: 400 });

  const intent = localUploadIntents.get(token);
  if (!intent) {
    return new NextResponse('Invalid or expired upload token', { status: 403 });
  }

  // Verify intent ownership
  if (intent.userId !== session.user.id) {
    return new NextResponse('Token user mismatch', { status: 403 });
  }

  // Verify expiration
  if (Date.now() > intent.expiresAt) {
    localUploadIntents.delete(token);
    return new NextResponse('Upload token expired', { status: 403 });
  }

  // Validate MIME Type
  const contentType = request.headers.get('content-type');
  if (contentType !== intent.mimeType) {
    return new NextResponse('MIME type mismatch', { status: 400 });
  }

  // Validate File Size (10MB limit already checked conceptually, but enforce it on buffer)
  const contentLength = Number(request.headers.get('content-length')) || 0;
  if (contentLength > 10 * 1024 * 1024) {
    return new NextResponse('Payload too large', { status: 413 });
  }

  try {
    // STRICT CONTAINMENT:
    // The key is generated server-side in admin-media.actions.ts, e.g. "editorial/posts/uuid.jpg".
    // Even so, we resolve the absolute path and ensure it remains inside public/uploads/editorial
    const baseUploadsDir = path.resolve(process.cwd(), 'public', 'uploads');
    const targetFilePath = path.resolve(baseUploadsDir, intent.key);

    if (!targetFilePath.startsWith(baseUploadsDir)) {
      throw new Error('Path traversal detected in generated key');
    }

    // Read raw body
    const arrayBuffer = await request.arrayBuffer();

    // Final size check just in case content-length was missing/forged
    if (arrayBuffer.byteLength > 10 * 1024 * 1024) {
      return new NextResponse('Payload too large', { status: 413 });
    }

    const buffer = Buffer.from(arrayBuffer);

    // Create directories safely
    const targetDir = path.dirname(targetFilePath);
    fs.mkdirSync(targetDir, { recursive: true });

    // Write file
    fs.writeFileSync(targetFilePath, buffer);

    // Consume intent
    localUploadIntents.delete(token);

    return new NextResponse('OK', { status: 200 });
  } catch (err) {
    console.error('Local upload proxy error:', err);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
