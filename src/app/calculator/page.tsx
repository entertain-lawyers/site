import { Metadata } from 'next';
import Link from 'next/link';
import CourtFeeCalculator from '@/components/calculator/CourtFeeCalculator';
import { Scale, HelpCircle, PhoneCall } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Nepal Court Fee Calculator | Section 69 Muluki Diwani Samhita | Entertain Lawyers',
  description: 'Calculate progressive court fees (कोर्ट फी / अदालती दस्तुर) for civil suits in Nepal under Section 69 of the National Civil Procedure (Code) Act, 2017.',
  keywords: [
    'Nepal court fee calculator',
    'court fee nepal',
    'Muluki Diwani Karyavidhi Samhita 2074 Section 69',
    'अदालती दस्तुर क्यालकुलेटर',
    'Nepal civil court filing fees',
    'Entertain Lawyers',
  ],
};

const FAQS = [
  {
    qEn: 'What is Court Fee?',
    qNp: 'अदालती दस्तुरभनेको के हो?',
    aEn:
      'As per section 63(2), Explanation of National Civil Procedure Code 2074: “Court Fee” means the fee payable when filing a plaint or appeal, or when applying for a review or rehearing of a case. The term also includes the fee payable by a person filing a counterclaim. In civil cases, the court fee is generally calculated progressively based on the amount claimed(Bigo), in accordance with Section 69 of the National Civil Procedure Code, 2017 (2074 B.S.).',
    aNp:
      'मुलुकी देवानी कार्यविधि संहिता २०७४ को दफा ६३(२) को स्पष्टीकरण बमोजिम “अदालत शुल्क” भन्नाले फिरादपत्र वा पुनरावदेन दिँदा वा मुद्दा पुनरावलोकन वा दोहोऱ्याउन दिँदा लिइने शुल्क सम्झनु पर्छ र सो शब्दले प्रतिदाबी लिनेले प्रतिदाबी लिए वापत बुझाउने शुल्क समेतलाई जनाउँछ। देवानी मुद्दामा बिगो दाबीको अनुपातमा मुलुकी देवानी कार्यविधि संहिता, २०७४ को दफा ६९ बमोजिम progressive दरमा दस्तुर निर्धारण हुन्छ।',
  },
  {
    qEn: 'Can the court fee be recovered if a party wins the case?',
    qNp: 'मुद्दा जितेमा बुझाएको कोर्ट फी फिर्ता पाइन्छ ?',
    aEn:
      'As per section 83(1) of National Civil Procedure Court, 2074: In a lawsuit involving court fees, the winning party may recover the court fees paid by them from the losing party in accordance with the court judgment.',
    aNp:
      'हो, मुलुकी देवानी कार्यविधि संहिता, २०७४ को दफा ८३(१) तथा सम्बन्धिले कानूनी व्यवस्था बमोजिम मुद्दा जित्ने पक्षले हार्ने पक्षबाट आफूले तिरेको अदालती दस्तुर (कोर्ट फी) भराई लिन पाउने कानूनी व्यवस्था रहेको छ। फैसला कार्यान्वयनको प्रक्रियामार्फत यो रकम असुल गर्न सकिन्छ।',
  },
  {
    qEn: 'How much court fee is payable in cases where the claim amount cannot be determined?',
    qNp: 'बिगो (दाबी रकम) नखुलेको मुद्दामा कति दस्तुर लाग्छ?',
    aEn:
      'As per Section 71(2) of National Civil Procedure Court, 2074: In any other civil case where the value or claim amount is not specified, a court fee of Rs. 1,000 is payable under Section 70 of the National Civil Procedure Code, 2074.',
    aNp:
      'मुलुकी देवानी कार्यविधि संहिता, २०७४ को दफा ७१(२) बमोजिमः मूल्य वा बिगो नखुलेको अन्य जुनसुकै देवानी मुद्दामा मुलुकी देवानी कार्यविधी संहिता २०७४ दफा ७० अनुसार एक हजार रुपैयाँ अदालती शुल्क लाग्ने व्यवस्था यसमा गरिएको छ।',
  },
  {
    qEn: 'How is the court fee charged when filing an appeal?',
    qNp: 'पुनरावेदन गर्दा कोर्ट फी कसरी लाग्छ ?',
    aEn:
      'Pursuant to National Civil Procedure Code, 2074 section 73: In cases where the value or claim amount is specified, an additional court fee equal to 15% of the court fee payable when filing the complaint shall be charged when filing an appeal at any level, to the extent the appellant is dissatisfied with the decision.\nIn partition cases where the claim amount is not specified, the same court fee as that payable when filing the complaint shall be charged when filing an appeal at any level.',
    aNp:
      'मुलुकी देवानी कार्यविधि संहिता, २०७४ को दफा ७३ बमोजिमः मूल्य वा बिगो खुलेको मुद्दामा जुनसुकै तहमा पुनरावेदन गर्दा जुन हदसम्म चित्त नबुझी पुनरावेदन गर्ने हो, सोही हदसम्म फिरादपत्र दर्ता गर्दा लाग्ने अदालत शुल्कको १५ प्रतिशत थप अदालत शुल्क लाग्नेछ। बिगो नखुलेको अंश मुद्दामा जुनसुकै तहमा पुनरावेदन दिँदा फिरादपत्र दर्ता गर्दा लागे सरहकै अदालत शुल्क लाग्नेछ।',
  },
  {
    qEn: 'How and where is the court fee paid?',
    qNp: 'अदालती दस्तुर कसरी र कहाँ बुझाइन्छ?',
    aEn:
      'In Nepal, court fees for filing a case or other legal proceedings can be paid at the cash counter of the concerned court. The original payment voucher must be submitted to the court’s registration section along with the plaint or application.',
    aNp:
      'नेपालका अदालतहरूमा मुद्दा दर्ता गर्दा वा अन्य कानुनी प्रक्रियाका लागि लाग्ने अदालती शुल्क सम्बन्धित अदालतको नगद काउन्टर बाट बुझाउन सकिन्छ। सोको सक्कल भौचर फिरादपत्र वा निवेदनसाथ अदालतको दर्ता शाखामा पेश गर्नुपर्दछ।',
  },
];

/**
 * FAQPage structured data so Google can surface these answers directly in
 * search results. Kept in sync with the visible FAQS array above.
 */
const FAQ_JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQS.map((faq) => ({
    '@type': 'Question',
    name: faq.qEn,
    acceptedAnswer: {
      '@type': 'Answer',
      text: faq.aEn,
    },
  })),
};

export default function CalculatorPage() {
  return (
    <div className="w-full bg-background min-h-screen pt-6 pb-24 sm:py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_JSON_LD) }}
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 sm:space-y-12">
        {/* Breadcrumb & Hero */}
        <div className="space-y-3 sm:space-y-4 max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 text-accent text-[11px] sm:text-xs font-bold">
            <Scale className="w-4 h-4" />
            <span>Legal Utility & Tools</span>
          </div>
          <h1 className="text-[clamp(1.7rem,6vw,3rem)] leading-[1.12] font-black text-navy dark:text-white tracking-tight text-balance">
            Nepal Court Fee Calculator
          </h1>
          <p className="text-text-secondary text-[clamp(0.9375rem,2vw,1.125rem)] max-w-2xl mx-auto leading-relaxed text-pretty">
            Exact, correct, authentic calculation of the court fees that need to be submitted before the court in Nepal in civil cases, as per Section 69 of the National Civil Procedure Code, 2074.
            <span lang="ne" className="block text-[13px] sm:text-sm text-text-muted">नेपालका अदालतहरूमा देवानी मुद्दा दर्ता गर्दा लाग्ने अदालती दस्तुरको यकिन हिसाब।</span>
          </p>
        </div>

        {/* Calculator Interactive Widget */}
        <CourtFeeCalculator />

        {/* Informational FAQ Section */}
        <div
          id="faqs"
          aria-labelledby="faq-heading"
          className="max-w-4xl mx-auto pt-6 sm:pt-8 border-t border-border space-y-6 sm:space-y-8 scroll-mt-24"
        >
          <div className="text-center space-y-1.5 sm:space-y-2">
            <div className="inline-flex items-center gap-2 text-accent font-bold text-[11px] sm:text-xs uppercase tracking-wider">
              <HelpCircle className="w-4 h-4" />
              <span>Frequently Asked Questions</span>
            </div>
            <h2
              id="faq-heading"
              className="text-[clamp(1.375rem,3.5vw,1.875rem)] leading-tight font-black text-navy dark:text-white text-balance"
            >
              Important Legal Information About Court Fee
            </h2>
            <p lang="ne" className="text-xs sm:text-sm text-text-muted font-semibold">
              कोर्ट फी सम्बन्धी महत्वपूर्ण कानूनी जानकारीहरू
            </p>
          </div>

          <div className="space-y-3 sm:space-y-4">
            {FAQS.map((faq, idx) => (
              <div
                key={idx}
                className="bg-surface rounded-2xl border border-border overflow-hidden transition-colors hover:border-accent/40"
              >
                {/* Question — English headline with the Nepali question beneath */}
                <div className="flex items-start gap-3 sm:gap-4 p-4 sm:p-5 bg-surface-alt/40 border-b border-border/70">
                  <span className="shrink-0 mt-0.5 w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-navy dark:bg-accent text-white flex items-center justify-center text-[11px] sm:text-xs font-black">
                    {idx + 1}
                  </span>
                  <div className="space-y-1 min-w-0">
                    <h3 className="text-[15px] sm:text-base font-bold text-navy dark:text-white leading-snug">
                      {faq.qEn}
                    </h3>
                    <p lang="ne" className="text-[13px] sm:text-sm font-medium text-accent leading-snug">
                      {faq.qNp}
                    </p>
                  </div>
                </div>

                {/* Answer — English prose, then the Nepali text in a quiet side rule */}
                <div className="px-4 py-4 sm:py-5 sm:pl-[4.25rem] sm:pr-5">
                  <div className="max-w-[40rem] space-y-3.5">
                    <p className="text-[15px] leading-7 text-text-secondary text-pretty whitespace-pre-line">
                      {faq.aEn}
                    </p>
                    <p
                      lang="ne"
                      className="text-[15px] leading-8 text-text-secondary border-l-2 border-accent/30 pl-3.5"
                    >
                      {faq.aNp}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Need Consultation Bottom Banner */}
          <div className="rounded-2xl sm:rounded-3xl bg-gradient-to-br from-surface-alt to-surface border border-border p-6 sm:p-8 text-center space-y-3 sm:space-y-4">
            <h3 className="text-[clamp(1.125rem,2.5vw,1.5rem)] font-black text-navy dark:text-white text-balance">
              Have any Question about court fee or want to suit a file?
            </h3>
            <p className="text-sm text-text-secondary max-w-lg mx-auto text-pretty">
              Our advocates assist in evaluating claim valuation, drafting civil plaints, defending counter-claims, and representing clients in courts across Nepal.
            </p>
            <div className="pt-1 sm:pt-2 flex flex-wrap justify-center gap-4">
              <Link
                href="/consultation?source=calculator_footer"
                className="w-full sm:w-auto justify-center px-6 py-3 min-h-[48px] rounded-full bg-accent hover:bg-accent-hover text-white text-sm font-bold shadow-md transition-all flex items-center gap-2 touch-manipulation active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <PhoneCall className="w-4 h-4" />
                <span>Book a Consultation</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
