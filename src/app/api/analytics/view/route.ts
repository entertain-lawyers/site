import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { rateLimit } from '@/lib/rate-limit';
import { getClientIp } from '@/lib/client-ip';

export const dynamic = 'force-dynamic';

/**
 * First-party page-view beacon from AnalyticsTracker. Stores one AccessLog
 * row (action = PAGE_VIEW) with a relative path, IP and user agent — no
 * cookies, no cross-site identifiers.
 */

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { action?: string; url?: string } | null;

  if (!body || body.action !== 'PAGE_VIEW') {
    return NextResponse.json({ error: 'invalid event' }, { status: 400 });
  }
  if (typeof body.url !== 'string' || !body.url.startsWith('/') || body.url.length > 256) {
    return NextResponse.json({ error: 'invalid url' }, { status: 400 });
  }

  const ip = getClientIp(request.headers);

  try {
    // Generous cap: normal browsing rarely exceeds ~2 views/minute.
    const limited = await rateLimit(`page-view:${ip}`, 60, 60);
    if (!limited.success) {
      return NextResponse.json({ ok: true, throttled: true }, { status: 429 });
    }
  } catch {
    // limiter unavailable → proceed (allowist + caps bound abuse)
  }

  try {
    await prisma.accessLog.create({
      data: {
        action: 'PAGE_VIEW',
        url: body.url,
        ipAddress: ip === 'anonymous' ? null : ip,
        userAgent: request.headers.get('user-agent')?.slice(0, 255) || null,
      },
    });
  } catch (error) {
    console.error('[AnalyticsView] failed to record view:', error);
  }

  return NextResponse.json({ ok: true });
}
