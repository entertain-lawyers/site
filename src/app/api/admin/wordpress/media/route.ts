import { NextResponse } from 'next/server';
import { Role } from '@prisma/client';
import { requireRole } from '@/lib/api-auth';
import { prisma } from '@/lib/prisma';
import {
  getWordPressWriteBlock,
  uploadWordPressMedia,
  WordPressApiError,
  WordPressAuthError,
  type WordPressLanguage,
} from '@/lib/wordpress';
import {
  formatMegabytes,
  safeUploadFilename,
  sniffImageMimeType,
  toWordPressMediaItem,
  validateImageFile,
  WP_MEDIA_MAX_BYTES,
} from '@/lib/wordpress-media';

export const runtime = 'nodejs';
export const maxDuration = 60;

// Multipart framing around the file; anything larger than this is oversized.
const MULTIPART_OVERHEAD_BYTES = 64 * 1024;

const fail = (status: number, error: string) => NextResponse.json({ error }, { status });

/**
 * Upload one featured image to the English or Nepali WordPress Media Library.
 *
 * This is a route handler rather than a server action so the browser can
 * report real upload progress (XHR). The WordPress credentials stay here; the
 * browser gets back the media id and image URLs only.
 */
export async function POST(request: Request) {
  const user = await requireRole(Role.ADMIN, Role.EDITOR);
  if (!user) return fail(401, 'Unauthorized');

  // Cookie-authenticated POST: refuse cross-site requests.
  const origin = request.headers.get('origin');
  if (origin && new URL(origin).host !== new URL(request.url).host) {
    return fail(403, 'Cross-origin uploads are not allowed.');
  }

  const blocked = getWordPressWriteBlock();
  if (blocked) return fail(403, blocked);

  const declaredLength = Number(request.headers.get('content-length') || 0);
  if (declaredLength > WP_MEDIA_MAX_BYTES + MULTIPART_OVERHEAD_BYTES) {
    return fail(413, `The image is larger than the ${formatMegabytes(WP_MEDIA_MAX_BYTES)} limit.`);
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail(400, 'The upload could not be read. Choose the image again.');
  }

  const file = form.get('file');
  const lang = form.get('lang');
  const title = typeof form.get('title') === 'string' ? String(form.get('title')).slice(0, 200) : '';
  if (!(file instanceof File)) return fail(400, 'No image was attached.');
  if (lang !== 'en' && lang !== 'ne') return fail(400, 'Unknown WordPress language.');

  const invalid = validateImageFile(file);
  if (invalid) return fail(file.size > WP_MEDIA_MAX_BYTES ? 413 : 415, invalid);

  const bytes = new Uint8Array(await file.arrayBuffer());
  const actualType = sniffImageMimeType(bytes);
  if (!actualType) return fail(415, 'The file is not a valid JPEG, PNG, WebP or GIF image.');
  if (actualType !== file.type) {
    return fail(415, `The file's contents (${actualType}) do not match its type (${file.type}).`);
  }

  try {
    const media = await uploadWordPressMedia(
      { bytes, filename: safeUploadFilename(file.name, actualType), mimeType: actualType, title },
      lang as WordPressLanguage
    );

    try {
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'CREATE',
          entityType: 'MEDIA_WP',
          entityId: String(media.id),
          details: { wpLang: lang, filename: file.name, size: file.size, mimeType: actualType },
        },
      });
    } catch (auditError) {
      console.error('[WordPress Partial Failure] Media uploaded but audit log failed:', auditError);
    }

    return NextResponse.json({ item: toWordPressMediaItem(media) }, { status: 201 });
  } catch (error) {
    console.error('[wordpress/media] upload failed', error instanceof Error ? error.message : error);
    if (error instanceof WordPressAuthError) {
      return fail(503, 'This server has no WordPress credentials, so images cannot be uploaded.');
    }
    if (error instanceof WordPressApiError) {
      if (error.status === 401 || error.status === 403) {
        return fail(403, `WordPress refused the upload (HTTP ${error.status}). The API user needs the upload_files capability and a valid application password.`);
      }
      if (error.status === 413) return fail(413, 'WordPress rejected the image as too large.');
      if (error.status === 408) return fail(504, 'WordPress took too long to accept the image. Try again.');
      const message = (error.data as { message?: unknown } | null)?.message;
      if (error.status === 400 && typeof message === 'string') {
        return fail(400, `WordPress rejected the image: ${message.replace(/<[^>]*>/g, '').trim()}`);
      }
    }
    return fail(502, 'WordPress could not store the image. Try again in a moment.');
  }
}
