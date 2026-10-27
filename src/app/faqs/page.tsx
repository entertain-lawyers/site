import { prisma } from '@/lib/prisma';
import FaqAccordion from './FaqAccordion';
import { HelpCircle } from 'lucide-react';
import { Metadata } from 'next';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Frequently Asked Questions',
  description: 'Find answers to common questions about Entertain Lawyers, our study materials, and subscriptions.',
  alternates: { canonical: '/faqs' },
};

export default async function FaqsPage() {
  const faqs = await prisma.fAQ.findMany({
    where: { status: 'PUBLISHED' },
    orderBy: { order: 'asc' },
  });

  return (
    <div className="min-h-screen bg-background py-16 lg:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="w-20 h-20 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <HelpCircle className="w-10 h-10 text-accent" />
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-navy dark:text-white tracking-tight mb-6">
            Frequently Asked Questions
          </h1>
          <p className="text-lg text-text-secondary leading-relaxed">
            Have questions? We have answers. If you can't find what you're looking for, feel free to contact us.
          </p>
        </div>

        {faqs.length > 0 ? (
          <FaqAccordion faqs={faqs} />
        ) : (
          <div className="max-w-4xl mx-auto py-24 text-center border-2 border-dashed border-border rounded-3xl bg-surface-alt/50">
            <h3 className="text-2xl font-bold text-navy dark:text-white mb-2 tracking-tight">No FAQs available</h3>
            <p className="text-text-secondary text-lg">Check back later for updates.</p>
          </div>
        )}

      </div>
    </div>
  );
}
