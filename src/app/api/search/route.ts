import { NextResponse } from 'next/server';
import { runSearch } from '@/lib/search-core';

export const dynamic = 'force-dynamic';
/** The AI provider chain needs a serverless budget beyond the default 10s. */
export const maxDuration = 30;

/** Global search API (heuristic + AI layers live in @/lib/search-core). */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q') ?? '';
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'anonymous';

  const result = await runSearch(q, ip);
  return NextResponse.json(result);
}
