import { KhaltiLookupResponse } from './khalti.types';

import { env } from '@/env';

export async function verifyKhaltiTransaction(pidx: string): Promise<KhaltiLookupResponse> {
  const secretKey = env.KHALTI_SECRET_KEY;
  if (!secretKey) throw new Error("KHALTI_SECRET_KEY is not configured");

  const baseUrl = env.NODE_ENV === 'production' 
    ? 'https://khalti.com/api/v2' 
    : 'https://dev.khalti.com/api/v2';

  const response = await fetch(`${baseUrl}/epayment/lookup/`, {
    method: 'POST',
    headers: {
      'Authorization': `Key ${secretKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ pidx }),
  });

  if (!response.ok) {
    throw new Error(`Khalti lookup failed with status: ${response.status}`);
  }

  const data = await response.json();
  return data as KhaltiLookupResponse;
}
