import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { CheckCircle, ArrowRight } from 'lucide-react';
import { auth } from '@/lib/auth';

export default async function PaymentSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ txId?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const session = await auth();

  let targetUrl = '/dashboard';
  let targetLabel = 'Go to Dashboard';
  let verified = false;

  if (resolvedSearchParams.txId && session?.user) {
    // Scope the lookup to the signed-in user: a leaked idempotency key must not
    // reveal another customer's transaction or link them into its content.
    const tx = await prisma.paymentTransaction.findFirst({
      where: {
        idempotencyKey: resolvedSearchParams.txId,
        userId: session.user.id,
      }
    });

    if (tx && tx.status === 'COMPLETED') {
      verified = true;
      if (tx.type === 'PURCHASE' && tx.targetId) {
        targetUrl = `/read/${tx.targetId}`;
        targetLabel = 'Read Document Now';
      } else if (tx.type === 'SUBSCRIPTION') {
        targetUrl = '/study';
        targetLabel = 'Browse Premium Content';
      }
    }
  }

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 bg-background">
      <div className="bg-surface p-6 sm:p-10 rounded-2xl shadow-soft border border-border max-w-md w-full text-center">
        <div className={`mx-auto flex items-center justify-center h-16 w-16 rounded-full border mb-6 shadow-sm ${verified ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
          <CheckCircle className={`h-8 w-8 ${verified ? 'text-green-600' : 'text-amber-600'}`} />
        </div>
        <h1 className="text-2xl font-bold text-navy dark:text-white mb-3">
          {verified ? 'Payment Successful!' : 'Payment Processing'}
        </h1>
        <p className="text-text-secondary font-medium mb-8">
          {verified
            ? 'Your transaction has been verified and access has been granted.'
            : 'We have not confirmed this payment yet. If you completed it, check your dashboard in a minute — do not pay again.'}
        </p>
        <Link
          href={targetUrl}
          className="w-full inline-flex justify-center items-center px-4 py-3.5 border border-transparent text-sm font-bold rounded-xl shadow-md text-white bg-accent hover:bg-accent-hover transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_15px_rgba(var(--color-accent),0.4)]"
        >
          {targetLabel}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
