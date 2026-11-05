import Link from 'next/link';
import { XCircle, ArrowLeft, Clock, Ban } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

type PaymentOutcome = 'failed' | 'cancelled' | 'pending';

/** Fixed copy for the failure reasons the callback route can emit. */
const REASON_MESSAGES: Record<string, { outcome: PaymentOutcome; message: string }> = {
  pending: {
    outcome: 'pending',
    message:
      'Your payment is still processing at the gateway. It may complete in a few minutes — check your Dashboard before paying again.',
  },
  cancelled: {
    outcome: 'cancelled',
    message:
      'Your payment was cancelled at the gateway — you have not been charged. You can start again from the checkout page any time.',
  },
  processing_error: {
    outcome: 'failed',
    message:
      'We could not verify your payment. Check your Dashboard for its current status; if you were charged but do not have access, please contact support with your transaction reference.',
  },
  missing_key: {
    outcome: 'failed',
    message:
      'The payment reference was missing. Please start the payment again from the checkout page.',
  },
};

const OUTCOME_COPY: Record<PaymentOutcome, { heading: string; note: string }> = {
  pending: {
    heading: 'Payment Processing',
    note: 'This payment is not finished yet. Wait a few minutes and refresh your Dashboard — do not pay twice for the same item.',
  },
  cancelled: {
    heading: 'Payment Cancelled',
    note: 'Your account has not been charged. If you believe this cancellation was an error, please try again or contact support.',
  },
  failed: {
    heading: 'Payment Failed',
    note: 'Your account has not been charged for this transaction. If you believe this is an error, please try again or contact support.',
  },
};

export default async function PaymentFailurePage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string, txId?: string }>;
}) {
  const resolvedParams = await searchParams;
  const defined =
    REASON_MESSAGES[resolvedParams.reason ?? ''] ?? REASON_MESSAGES.processing_error;
  const { outcome, message: reason } = defined;
  const { heading, note } = OUTCOME_COPY[outcome];

  let targetUrl = '/';
  let targetLabel = 'Return Home';

  if (resolvedParams.txId) {
    const session = await auth();
    // Scope the lookup to the signed-in user so a leaked key cannot reveal
    // another customer's transaction.
    const tx = session?.user?.id
      ? await prisma.paymentTransaction.findFirst({
          where: {
            idempotencyKey: resolvedParams.txId,
            userId: session.user.id,
          }
        })
      : null;

    if (tx) {
      if (tx.type === 'PURCHASE' && tx.targetId) {
        targetUrl = `/read/${tx.targetId}`;
        targetLabel = 'Return to Document';
      } else if (tx.type === 'SUBSCRIPTION') {
        targetUrl = '/study';
        targetLabel = 'Return to Study Library';
      }
    }
  }

  const OutcomeIcon = outcome === 'pending' ? Clock : outcome === 'cancelled' ? Ban : XCircle;
  const tintClass =
    outcome === 'pending'
      ? 'bg-amber-50 border-amber-200'
      : outcome === 'cancelled'
        ? 'bg-orange-50 border-orange-200'
        : 'bg-red-50 border-red-200';

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 bg-background">
      <div className="bg-surface p-6 sm:p-10 rounded-2xl shadow-soft border border-border max-w-md w-full text-center">
        <div className={`mx-auto flex items-center justify-center h-16 w-16 rounded-full border mb-6 shadow-sm ${tintClass}`}>
          <OutcomeIcon className={`h-8 w-8 ${outcome === 'pending' ? 'text-amber-600' : outcome === 'cancelled' ? 'text-orange-600' : 'text-red-600'}`} />
        </div>
        <h1 className="text-2xl font-bold text-navy dark:text-white mb-2">{heading}</h1>
        <p className="text-text-secondary font-medium mb-6 break-words">
          {reason}
        </p>
        <div className={`${tintClass} text-sm p-4 rounded-xl mb-8 text-left font-medium`}>
          {note}
        </div>
        <Link href={targetUrl} className="w-full inline-flex justify-center items-center px-4 py-3.5 border border-border shadow-sm text-sm font-bold rounded-xl text-navy dark:text-white bg-surface-alt hover:bg-border transition-colors">
          <ArrowLeft className="mr-2 h-4 w-4" />
          {targetLabel}
        </Link>
      </div>
    </div>
  );
}
