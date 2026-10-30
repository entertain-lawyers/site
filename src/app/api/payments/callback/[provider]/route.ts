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
    let body: Record<string, unknown> = {};
    if (request.method === 'POST') {
      try {
        const raw = await request.text();
        // Gateways send a few hundred bytes. Refuse oversized bodies before
        // parsing so an unauthenticated endpoint cannot be used to allocate
        // arbitrary memory.
        if (raw.length > 16_384) {
          return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
        }
        if (raw) body = JSON.parse(raw) as Record<string, unknown>;
      } catch {
        // Not JSON
      }
    }

    const payload = { ...query, ...body };

    // Determine idempotencyKey based on provider
    if (provider === 'ESEWA') {
      // eSewa data is base64 encoded in 'data'
      const data = (payload as Record<string, unknown>).data;
      if (typeof data === 'string' && data.length <= 16_384) {
        const decoded = JSON.parse(Buffer.from(data, 'base64').toString()) as Record<string, unknown>;
        idempotencyKey = typeof decoded.transaction_uuid === 'string' ? decoded.transaction_uuid : null;
      }
    } else if (provider === 'KHALTI') {
      const purchaseOrderId = (payload as Record<string, unknown>).purchase_order_id;
      idempotencyKey = typeof purchaseOrderId === 'string' ? purchaseOrderId : null;
      if (!idempotencyKey) {
        const pidx = (payload as Record<string, unknown>).pidx;
        if (typeof pidx === 'string') {
          const tx = await prisma.paymentTransaction.findUnique({
            where: { providerRef: pidx }
          });
          if (tx) idempotencyKey = tx.idempotencyKey;
        }
      }
    }

    if (!idempotencyKey) {
      // Redirect to failure page if we can't figure out the key
      return NextResponse.redirect(new URL('/payment/failure?reason=missing_key', request.url));
    }

    await paymentCoreService.verifyAndFinalizePayment(provider, payload, idempotencyKey);

    // Redirect to success
    return NextResponse.redirect(new URL(`/payment/success?txId=${idempotencyKey}`, request.url));
  } catch (error) {
    console.error('Payment callback error:', error);
    // Safe failure redirect — do not expose internal error details to the client
    const failUrl = new URL(`/payment/failure`, request.url);
    failUrl.searchParams.set('reason', 'processing_error');
    if (idempotencyKey) {
      failUrl.searchParams.set('txId', idempotencyKey);
    }
    return NextResponse.redirect(failUrl);
  }
}
