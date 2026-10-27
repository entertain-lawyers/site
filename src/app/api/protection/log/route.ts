import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { rateLimit } from '@/lib/rate-limit';
import { getClientIp } from '@/lib/client-ip';

export const dynamic = 'force-dynamic';

/**
 * Receives blocked copy-protection events from the public site
 * (ContentProtection component) and persists them to AccessLog so the admin
 * dashboard can show "Content Protection Activity" like WP Copy-Protection
 * plugins do.
 *
 * Events are anonymous (visitors are not authenticated); only the action
 * kind, public URL path, IP and user agent are stored. Never logged: page
 * content, keystrokes beyond the blocked shortcut, or form interactions.
 */

const ALLOWED_ACTIONS = new Set([
  'PROTECTION_COPY_BLOCKED',
  'PROTECTION_CUT_BLOCKED',
  'PROTECTION_SAVE_BLOCKED',
  'PROTECTION_PRINT_BLOCKED',
  'PROTECTION_VIEW_SOURCE_BLOCKED',
  'PROTECTION_CONTEXT_MENU_BLOCKED',
  'PROTECTION_DRAG_BLOCKED',
]);

const MAX_EVENTS_PER_REQUEST = 20;

interface ProtectionEvent {
  action?: string;
  url?: string;
  at?: number;
}

function sanitizeUrl(raw: string | undefined): string | null {
  if (typeof raw !== 'string' || raw.length > 512) return null;
  // Only same-origin relative paths are accepted — an absolute URL here would
  // be either a spoof attempt or a misconfigured client; drop both.
  if (!raw.startsWith('/')) return null;
  return raw.slice(0, 256);
}

export async function POST(request: Request) {
  let ip = 'anonymous';
  try {
    ip = getClientIp(request.headers);
    const limited = await rateLimit(`protection-log:${ip}`, 20, 60);
    if (!limited.success) {
      return NextResponse.json({ ok: true, stored: 0, throttled: true }, { status: 429 });
    }
  } catch {
    // limiter unavailable → proceed (durable limits: allowlist + caps below)
  }

  const body = (await request.json().catch(() => null)) as { events?: ProtectionEvent[] } | null;
  if (!body || !Array.isArray(body.events) || body.events.length === 0) {
    return NextResponse.json({ error: 'events required' }, { status: 400 });
  }
  const events = body.events.slice(0, MAX_EVENTS_PER_REQUEST);

  const userAgent = request.headers.get('user-agent')?.slice(0, 255) || null;

  // An hour-wide window: client also de-dupes, server stamps its own time so a
  // flood replaying old timestamps cannot backdate history.
  const rows = events
    .map((event) => {
      const action = typeof event?.action === 'string' ? event.action : '';
      if (!ALLOWED_ACTIONS.has(action)) return null;
      const url = sanitizeUrl(event.url);
      if (!url) return null;
      // Anonymous rows: keep only IP-derived hash-less ip + ua, userId stays null.
      return {
        action,
        url,
        ipAddress: ip === 'anonymous' ? null : ip,
        userAgent,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  if (rows.length === 0) {
    return NextResponse.json({ ok: true, stored: 0 });
  }

  try {
    await prisma.accessLog.createMany({ data: rows });
  } catch (error) {
    // Logging must never break the visitor's page — swallow and ack.
    console.error('[ProtectionLog] failed to store events:', error);
  }

  return NextResponse.json({ ok: true, stored: rows.length });
}
