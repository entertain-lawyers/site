import { Metadata } from 'next';
import Link from 'next/link';
import CourtFeeCalculator from '@/components/calculator/CourtFeeCalculator';
import { Scale, BookOpen, ChevronRight, HelpCircle, FileCheck, PhoneCall } from 'lucide-react';

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
    q: 'कोर्ट फी (Court Fee / अदालती दस्तुर) भनेको के हो?',
    a: 'नेपालका अदालतहरूमा फिरादपत्र, प्रतिउत्तरपत्र, पुनरावेदन वा निवेदन दर्ता गर्दा ऐन कानुन बमोजिम सरकारी राजस्व खातामा बुझाउनुपर्ने न्यायिक दस्तुरलाई कोर्ट फी भनिन्छ। देवानी मुद्दामा बिगो दाबीको अनुपातमा मुलुकी देवानी कार्यविधि संहिता, २०७४ को दफा ६९ बमोजिम progressive दरमा दस्तुर निर्धारण हुन्छ।',
  },
  {
    q: 'मुद्दा जितेमा बुझाएको कोर्ट फी फिर्ता पाइन्छ?',
    a: 'हो, मुलुकी देवानी कार्यविधि संहिता, २०७४ को दफा ७५ तथा सम्बन्धित कानूनी व्यवस्था बमोजिम मुद्दा जित्ने पक्षले हार्ने पक्षबाट आफूले तिरेको अदालती दस्तुर (कोर्ट फी) भराई लिन पाउने कानूनी व्यवस्था रहेको छ। फैसला कार्यान्वयनको प्रक्रियामार्फत यो रकम असुल गर्न सकिन्छ।',
  },
  {
    q: 'बिगो (दाबी रकम) नखुलेको मुद्दामा कति दस्तुर लाग्छ?',
    a: 'सम्बन्धविच्छेद, मानाचामल, हककायम, बाटो खुलाउने, वा अन्य बिगो निर्धारण हुन नसक्ने देवानी मुद्दाहरूमा ऐनको दफा ७० तथा अन्य दफाहरू बमोजिम तोकिएको निश्चित दस्तुर (Flat Statutory Fee) लाग्दछ।',
  },
  {
    q: 'पुनरावेदन (Appeal) गर्दा कोर्ट फी कसरी लाग्छ?',
    a: 'सुरु अदालतको फैसला उपर उच्च अदालत वा सर्वोच्च अदालतमा पुनरावेदन गर्दा सुरुमा लागेको अदालती दस्तुरको कानुन बमोजिम निश्चित प्रतिशत वा ऐनको दफा ७१ बमोजिम पुनरावेदन दस्तुर बुझाउनुपर्ने हुन्छ।',
  },
  {
    q: 'अदालती दस्तुर कसरी र कहाँ बुझाइन्छ?',
    a: 'सम्बन्धित अदालतको राजस्व खाता (Nepal Government Judicial Revenue Account) मा तोकिएको भौचरमार्फत बैंकमा रकम दाखिला गरी सोको सक्कल भौचर फिरादपत्र वा निवेदनसाथ अदालतको दर्ता शाखामा पेश गर्नुपर्दछ।',
  },
];

export default function CalculatorPage() {
  return (
    <div className="w-full bg-background min-h-screen py-10 sm:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Breadcrumb & Hero */}
        <div className="space-y-4 max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 text-accent text-xs font-bold">
            <Scale className="w-4 h-4" />
            <span>Legal Utility & Tools</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-navy dark:text-white tracking-tight">
            Nepal Court Fee Calculator
          </h1>
          <p className="text-text-secondary text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
            नेपालका अदालतहरूमा देवानी मुद्दा दर्ता गर्दा लाग्ने कानूनी दस्तुरको यकिन हिसाब। Based on Section 69 of the National Civil Procedure (Code) Act, 2017.
          </p>
        </div>

        {/* Calculator Interactive Widget */}
        <CourtFeeCalculator />

        {/* Informational FAQ Section */}
        <div className="max-w-4xl mx-auto pt-8 border-t border-border space-y-8">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-2 text-accent font-bold text-xs uppercase tracking-wider">
              <HelpCircle className="w-4 h-4" />
              <span>Frequently Asked Questions</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-navy dark:text-white">
              कोर्ट फी सम्बन्धी महत्वपूर्ण कानूनी जानकारीहरू
            </h2>
          </div>

          <div className="space-y-4">
            {FAQS.map((faq, idx) => (
              <div
                key={idx}
                className="bg-surface rounded-2xl p-6 border border-border space-y-2 transition-all hover:border-accent/40"
              >
                <h3 className="text-base font-bold text-text-primary flex items-start gap-2.5">
                  <span className="text-accent font-black">Q{idx + 1}.</span>
                  <span>{faq.q}</span>
                </h3>
                <p className="text-sm text-text-secondary leading-relaxed pl-7">
                  {faq.a}
                </p>
              </div>
            ))}
          </div>

          {/* Need Consultation Bottom Banner */}
          <div className="rounded-3xl bg-surface-alt border border-border p-8 text-center space-y-4">
            <h3 className="text-xl sm:text-2xl font-black text-navy dark:text-white">
              Have Questions About Court Valuation or Suit Filing?
            </h3>
            <p className="text-text-secondary text-sm max-w-xl mx-auto">
              Our advocates assist in evaluating claim valuation, drafting civil plaints, defending counter-claims, and representing clients in courts across Nepal.
            </p>
            <div className="pt-2 flex flex-wrap justify-center gap-4">
              <Link
                href="/consultation?source=calculator_footer"
                className="px-6 py-3 rounded-full bg-accent hover:bg-accent-hover text-white text-sm font-bold shadow-md transition-all flex items-center gap-2"
              >
                <PhoneCall className="w-4 h-4" />
                <span>Book a Consultation</span>
              </Link>
              <Link
                href="/team"
                className="px-6 py-3 rounded-full bg-surface hover:bg-black/5 dark:hover:bg-white/5 text-text-primary border border-border text-sm font-bold transition-all"
              >
                <span>Meet Our Team</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
