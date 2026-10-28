import Link from 'next/link';
import { XCircle, ArrowLeft } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

/** Fixed copy for the failure reasons the callback route can emit. */
const REASON_MESSAGES: Record<string, string> = {
  processing_error:
    'We could not verify your payment. If you were charged, please contact support with your transaction reference.',
  missing_key:
    'The payment reference was missing. Please start the payment again from the checkout page.',
};

export default async function PaymentFailurePage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string, txId?: string }>;
}) {
  const resolvedParams = await searchParams;
  const reason =
    REASON_MESSAGES[resolvedParams.reason ?? ''] ??
    'Unknown error occurred during payment verification.';

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

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 bg-background">
      <div className="bg-surface p-6 sm:p-10 rounded-2xl shadow-soft border border-border max-w-md w-full text-center">
        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-50 border border-red-200 mb-6 shadow-sm">
          <XCircle className="h-8 w-8 text-red-600" />
        </div>
        <h1 className="text-2xl font-bold text-navy dark:text-white mb-2">Payment Failed</h1>
        <p className="text-text-secondary font-medium mb-6 break-words">
          {reason}
        </p>
        <div className="bg-red-50 border border-red-100 text-red-800 text-sm p-4 rounded-xl mb-8 text-left font-medium">
          Your account has not been charged for this transaction. If you believe this is an error, please try again or contact support.
        </div>
        <Link href={targetUrl} className="w-full inline-flex justify-center items-center px-4 py-3.5 border border-border shadow-sm text-sm font-bold rounded-xl text-navy dark:text-white bg-surface-alt hover:bg-border transition-colors">
          <ArrowLeft className="mr-2 h-4 w-4" />
          {targetLabel}
        </Link>
      </div>
    </div>
  );
}
