import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { paymentCoreService } from '@/modules/payments/core/payment.service';
import { PaymentProvider } from '@/modules/payments/core/payment.types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const p = await params;
  return handleCallback(request, p.provider);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const p = await params;
  return handleCallback(request, p.provider);
}

async function handleCallback(request: NextRequest, providerParam: string) {
  let idempotencyKey: string | null = null;
  try {
    const provider = providerParam.toUpperCase() as PaymentProvider;
    
    if (provider !== 'ESEWA' && provider !== 'KHALTI') {
      return NextResponse.json({ error: 'Invalid provider' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const query = Object.fromEntries(searchParams.entries());

    // Some providers might POST JSON, some might send URL query
    let body = {};
    if (request.method === 'POST') {
      try {
        body = await request.json();
      } catch (e) {
        // Not JSON
      }
    }

    const payload = { ...query, ...body };

    // Determine idempotencyKey based on provider
    if (provider === 'ESEWA') {
      // eSewa data is base64 encoded in 'data'
      if ((payload as any).data) {
        const decoded = JSON.parse(Buffer.from((payload as any).data as string, 'base64').toString());
        idempotencyKey = decoded.transaction_uuid;
      }
    } else if (provider === 'KHALTI') {
      idempotencyKey = (payload as any).purchase_order_id as string;
      if (!idempotencyKey && (payload as any).pidx) {
        const tx = await prisma.paymentTransaction.findUnique({
          where: { providerRef: (payload as any).pidx as string }
        });
        if (tx) idempotencyKey = tx.idempotencyKey;
      }
    }

    if (!idempotencyKey) {
      // Redirect to failure page if we can't figure out the key
      return NextResponse.redirect(new URL('/payment/failure?reason=missing_key', request.url));
    }

    await paymentCoreService.verifyAndFinalizePayment(provider, payload, idempotencyKey);

    // Redirect to success
    return NextResponse.redirect(new URL(`/payment/success?txId=${idempotencyKey}`, request.url));
  } catch (error: any) {
    console.error('Payment callback error:', error);
    // Safe failure redirect
    const failUrl = new URL(`/payment/failure`, request.url);
    failUrl.searchParams.set('reason', error.message || 'unknown');
    if (idempotencyKey) {
      failUrl.searchParams.set('txId', idempotencyKey);
    }
    return NextResponse.redirect(failUrl);
  }
}
