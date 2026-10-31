import { prisma } from '@/lib/prisma';
import { CheckoutButtonsSubscription } from '@/components/payments/CheckoutButtonsSubscription';
import { env } from '@/env';
import { getDictionary } from '@/lib/i18n';
import { CheckCircle2, HelpCircle } from 'lucide-react';
import { unstable_cache } from 'next/cache';
import { Reveal } from '@/components/motion/primitives';

export async function generateMetadata() {
  const dict = await getDictionary();
  return {
    title: `${dict.subscriptionPlans}`,
    description: dict.subscriptionDesc,
    alternates: { canonical: '/pricing' },
  };
}

export default async function PricingPage() {
  const dict = await getDictionary();

  const getCachedPlans = unstable_cache(
    async () => {
      return prisma.plan.findMany({
        where: { isActive: true },
        orderBy: { priceAmount: 'asc' }
      });
    },
    ['pricing-plans'],
    { revalidate: 3600 }
  );

  const plans = await getCachedPlans();

  const features = [
    dict.featAllPremium,
    dict.featSecureViewer,
    dict.featAllSemesters,
    dict.featUpdatedRegularly,
    "Priority support access",
    "Ad-free reading experience"
  ];

  const faqs = [
    {
      q: "When will I be charged?",
      a: "You will be charged immediately upon subscribing. The subscription is non-recurring; you will only be charged once for the specified duration."
    },
    {
      q: "Can I access the notes offline?",
      a: "Currently, our secure document viewer requires an active internet connection to prevent unauthorized distribution and protect intellectual property."
    },
    {
      q: "Are there any hidden fees?",
      a: "No, the price you see is the final price. We do not charge any hidden transaction fees or taxes on top of the listed price."
    },
    {
      q: "How often is the content updated?",
      a: "Our legal experts review and update the precedent case laws and study notes regularly to ensure they reflect the latest syllabus and court rulings."
    }
  ];

  return (
    <div className="min-h-screen bg-background transition-colors duration-300 pb-20">

      {/* Hero Header */}
      <div className="bg-surface border-b border-border relative overflow-hidden pt-20 pb-24">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-accent/10 via-background to-transparent dark:from-accent/20 dark:via-background dark:to-transparent opacity-80 pointer-events-none" />

        <div className="text-center max-w-3xl mx-auto px-4 relative z-10">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-navy dark:text-white mb-6 tracking-tight drop-shadow-sm">
            Transparent, Simple <span className="text-accent bg-clip-text text-transparent bg-gradient-to-r from-accent to-blue-500">Pricing</span>
          </h1>
          <p className="text-lg sm:text-xl text-text-secondary leading-relaxed font-medium">
            {dict.subscriptionDesc} Get full, unrestricted access to our entire library of premium law notes, precedent case laws, and old question papers.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-12 relative z-20">
        {plans.length === 0 ? (
          <div className="p-12 bg-surface/80 backdrop-blur-xl border border-border rounded-2xl max-w-xl mx-auto text-center shadow-[0_8px_30px_rgba(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.2)]">
            <h3 className="text-2xl font-black text-navy dark:text-white mb-4">{dict.plansComingSoon}</h3>
            <p className="text-text-secondary text-lg">{dict.plansComingSoonDesc}</p>
          </div>
        ) : (
          <div className="flex justify-center mb-24">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 w-full max-w-5xl">
              {plans.map((plan, index) => (
                <Reveal index={index} perRow={3} lift
                  key={plan.id}
                  className={`bg-surface/90 backdrop-blur-xl rounded-3xl border ${index === 0 ? 'border-accent shadow-[0_0_40px_rgba(var(--color-accent),0.15)]' : 'border-border shadow-soft'} flex flex-col relative overflow-hidden transition-[box-shadow,border-color,background-color] duration-500 hover:shadow-[0_20px_40px_rgba(var(--color-accent),0.2)] group`}
                >
                  {/* Highlight Ribbon */}
                  {index === 0 && (
                    <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-accent to-blue-500" />
                  )}
                  {index === 0 && (
                     <div className="absolute top-5 right-5 bg-accent text-white text-xs font-extrabold uppercase tracking-widest py-1.5 px-3 rounded-full shadow-md">
                       Recommended
                     </div>
                  )}

                  <div className="p-5 sm:p-8 lg:p-10 flex-1">
                    <h3 className="text-xl sm:text-2xl font-black text-navy dark:text-white mb-4">{plan.name}</h3>
                    <div className="flex flex-wrap items-baseline mb-3 gap-1">
                      <span className="text-3xl sm:text-5xl font-black text-navy dark:text-white tracking-tight">
                        NPR {(plan.priceAmount / 100).toFixed(0)}
                      </span>
                      <span className="text-text-muted ml-2 font-bold uppercase tracking-wider text-sm">/ {plan.durationDays} {dict.days}</span>
                    </div>
                    <p className="text-text-secondary text-sm mb-8 pb-8 border-b border-border/60 leading-relaxed font-medium">
                      Full access to all premium features for {plan.durationDays} days. Uninterrupted learning.
                    </p>

                    <ul className="space-y-4 mb-8">
                      {features.map((feature, idx) => (
                        <li key={idx} className="flex items-start text-text-primary group/item">
                          <div className="p-1 rounded-full bg-accent/10 text-accent mr-4 shrink-0 group-hover/item:scale-110 transition-transform">
                            <CheckCircle2 className="w-4 h-4" />
                          </div>
                          <span className="font-semibold text-[15px] mt-0.5">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="p-5 sm:p-8 lg:p-10 pt-0 mt-auto">
                    <CheckoutButtonsSubscription 
                      planId={plan.id} 
                      paymentsEnabled={env.PAYMENTS_ENABLED === 'true'}
                    />
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        )}

        {/* FAQ Section */}
        <div className="max-w-4xl mx-auto pt-20">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-black text-navy dark:text-white mb-4 tracking-tight">Frequently Asked Questions</h2>
            <p className="text-lg text-text-secondary font-medium">Everything you need to know about our premium subscriptions.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
            {faqs.map((faq, idx) => (
              <div key={idx} className="bg-surface/50 hover:bg-surface backdrop-blur-sm p-5 sm:p-8 rounded-2xl sm:rounded-3xl border border-border transition-all duration-300 hover:shadow-soft group">
                <div className="flex items-start gap-5">
                  <div className="p-3 rounded-2xl bg-accent/10 text-accent shrink-0 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                    <HelpCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-navy dark:text-white mb-3 leading-snug">{faq.q}</h4>
                    <p className="text-text-secondary leading-relaxed text-[15px] font-medium">{faq.a}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
