import { NextResponse } from 'next/server';
import { runSearch } from '@/lib/search-core';
import { getClientIp } from '@/lib/client-ip';

export const dynamic = 'force-dynamic';
/** The AI provider chain needs a serverless budget beyond the default 10s. */
export const maxDuration = 30;

/** Global search API (heuristic + AI layers live in @/lib/search-core). */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q') ?? '';
  const ip = getClientIp(request.headers);

  const result = await runSearch(q, ip);
  return NextResponse.json(result);
}
