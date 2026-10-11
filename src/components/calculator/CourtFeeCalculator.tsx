'use client';

import { useState, useId, useTransition } from 'react';
import Link from 'next/link';
import { 
  Calculator, 
  Scale, 
  Receipt, 
  ArrowRight, 
  HelpCircle, 
  ExternalLink, 
  Info,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import { calculateCourtFee, formatNpr, parseClaimAmount } from '@/lib/court-fee';

const PRESET_AMOUNTS = [
  { label: 'रु. २५,०००', value: 25000, desc: 'न्यूनतम स्ल्याब' },
  { label: 'रु. १,००,०००', value: 100000, desc: '१ लाख' },
  { label: 'रु. ५,००,०००', value: 500000, desc: '५ लाख' },
  { label: 'रु. २५,००,०००', value: 2500000, desc: '२५ लाख' },
  { label: 'रु. १,००,००,०००', value: 10000000, desc: '१ करोड' },
];

export default function CourtFeeCalculator() {
  const [inputValue, setInputValue] = useState<string>('500000');
  const inputId = useId();
  const [, startTransition] = useTransition();

  const parsed = parseClaimAmount(inputValue);
  const calculation = parsed.valid && parsed.value !== null ? calculateCourtFee(parsed.value) : null;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    startTransition(() => {
      setInputValue(val);
    });
  };

  const handlePresetClick = (amount: number) => {
    setInputValue(amount.toString());
  };

  const consultationHref = calculation
    ? `/consultation?claimAmount=${calculation.claimAmount}&courtFee=${calculation.totalFee}&source=calculator`
    : '/consultation?source=calculator';

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8">
      {/* Calculator Main Box */}
      <div className="bg-surface rounded-2xl border border-border shadow-lg overflow-hidden">
        {/* Header bar */}
        <div className="bg-navy px-6 py-5 text-white flex flex-wrap items-center justify-between gap-4 border-b border-border/20">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-accent/20 text-[#ddba76] border border-[#ddba76]/30">
              <Calculator className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">Court Fee Calculator (कोर्ट फी क्यालकुलेटर)</h2>
              <p className="text-xs text-white/70 mt-0.5">
                Pursuant to Section 69, National Civil Procedure (Code) Act, 2017 (मुलुकी देवानी कार्यविधि संहिता, २०७४)
              </p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full bg-white/10 text-white/90">
            <Scale className="w-3.5 h-3.5 text-[#ddba76]" />
            <span>Nepal Civil Law</span>
          </div>
        </div>

        <div className="p-6 sm:p-8 space-y-6">
          {/* Claim Amount Input Section */}
          <div>
            <label htmlFor={inputId} className="block text-sm font-bold text-text-primary mb-2">
              Claim Amount / बिगो वा दाबी रकम (NPR)
            </label>
            <div className="relative rounded-xl shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-text-muted font-bold text-base">
                Rs.
              </div>
              <input
                id={inputId}
                type="text"
                value={inputValue}
                onChange={handleInputChange}
                placeholder="उदा. 500000 वा 25,00,000"
                className={`block w-full pl-14 pr-4 py-3.5 text-lg font-bold rounded-xl border bg-background text-text-primary placeholder:text-text-muted/60 focus:outline-none focus:ring-2 transition-all ${
                  !parsed.valid && inputValue.trim() !== ''
                    ? 'border-red-500 focus:ring-red-500/20'
                    : 'border-border focus:ring-accent/30 focus:border-accent'
                }`}
                aria-describedby={!parsed.valid ? 'input-error' : undefined}
              />
            </div>

            {/* Error prompt */}
            {!parsed.valid && inputValue.trim() !== '' && (
              <p id="input-error" className="mt-2 text-xs font-semibold text-red-500 flex items-center gap-1.5">
                <Info className="w-4 h-4 shrink-0" />
                {parsed.error}
              </p>
            )}

            {/* Presets */}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-text-muted mr-1">Quick Presets:</span>
              {PRESET_AMOUNTS.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => handlePresetClick(preset.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                    parsed.valid && parsed.value === preset.value
                      ? 'bg-accent text-white border-accent shadow-sm'
                      : 'bg-surface-alt hover:bg-black/5 dark:hover:bg-white/5 text-text-secondary border-border'
                  }`}
                  title={preset.desc}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Results Display */}
          {calculation && (
            <div className="space-y-6 pt-2">
              {/* Highlight summary card */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-surface-alt to-surface border border-border">
                <div className="space-y-1">
                  <div className="text-xs font-bold uppercase tracking-wider text-text-muted">Total Claim (बिगो रकम)</div>
                  <div className="text-xl sm:text-2xl font-black text-text-primary">
                    रु. {formatNpr(calculation.claimAmount)}
                  </div>
                  <div className="text-xs text-text-muted">Assessed Valuation</div>
                </div>

                <div className="space-y-1 md:border-l md:border-border md:pl-6">
                  <div className="text-xs font-bold uppercase tracking-wider text-accent">Total Court Fee (जम्मा कोर्ट फी)</div>
                  <div className="text-2xl sm:text-3xl font-black text-navy dark:text-[#ddba76]">
                    रु. {formatNpr(calculation.totalFee)}
                  </div>
                  <div className="text-xs text-text-muted flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    Statutory progressive rate
                  </div>
                </div>

                <div className="space-y-1 md:border-l md:border-border md:pl-6">
                  <div className="text-xs font-bold uppercase tracking-wider text-text-muted">Effective Rate (प्रभावकारी दर)</div>
                  <div className="text-xl sm:text-2xl font-black text-text-primary">
                    {calculation.effectiveRatePercent.toFixed(2)}%
                  </div>
                  <div className="text-xs text-text-muted">Relative to total claim</div>
                </div>
              </div>

              {/* Progressive Slabs Breakdown */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-accent" />
                    Slab-by-Slab Statutory Breakdown (दफा ६९ अनुसार स्ल्याब विवरण)
                  </h3>
                  <span className="text-xs text-text-muted">Progressive Calculation</span>
                </div>

                <div className="overflow-x-auto rounded-xl border border-border">
                  <table className="w-full text-left text-xs sm:text-sm border-collapse">
                    <thead>
                      <tr className="bg-surface-alt border-b border-border text-text-muted font-bold text-xs">
                        <th className="py-3 px-4">Slab / दायरा</th>
                        <th className="py-3 px-4">Statutory Rate / दर</th>
                        <th className="py-3 px-4">Applicable In Slab / दाबी रकम</th>
                        <th className="py-3 px-4 text-right">Fee / दस्तुर (रु.)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {calculation.breakdown.map((row) => (
                        <tr
                          key={row.slabId}
                          className={`transition-colors ${
                            row.isApplicable
                              ? 'bg-accent/5 font-semibold text-text-primary'
                              : 'text-text-muted opacity-60'
                          }`}
                        >
                          <td className="py-3 px-4">
                            <div className="font-bold">{row.rangeLabelNepali}</div>
                            <div className="text-xs opacity-75">{row.rangeLabel}</div>
                          </td>
                          <td className="py-3 px-4 font-mono font-medium">{row.rateLabel}</td>
                          <td className="py-3 px-4 font-mono">
                            {row.amountInSlab > 0 ? `रु. ${formatNpr(row.amountInSlab)}` : '—'}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold">
                            {row.feeInSlab > 0 ? `रु. ${formatNpr(row.feeInSlab)}` : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-surface-alt font-black text-text-primary border-t-2 border-border">
                        <td colSpan={3} className="py-3.5 px-4 text-right">
                          कुल अदालती दस्तुर (Total Statutory Court Fee):
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono text-base text-navy dark:text-[#ddba76]">
                          रु. {formatNpr(calculation.totalFee)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Consultation Callout */}
              <div className="p-5 sm:p-6 rounded-2xl bg-navy text-white flex flex-col sm:flex-row items-center justify-between gap-5 shadow-md">
                <div className="space-y-1 text-center sm:text-left">
                  <div className="text-xs font-bold uppercase tracking-wider text-[#ddba76]">
                    Need Legal Assistance With Filing?
                  </div>
                  <h4 className="text-base sm:text-lg font-bold">
                    Schedule a Consultation with our Court Advocates
                  </h4>
                  <p className="text-xs text-white/80 max-w-xl">
                    Get counsel on suit drafting, claim valuation, witness preparation, and representation in District, High, and Supreme Courts.
                  </p>
                </div>
                <Link
                  href={consultationHref}
                  className="shrink-0 flex items-center gap-2 px-5 py-3 rounded-xl bg-accent hover:bg-accent-hover text-white text-sm font-bold shadow-md transition-all hover:scale-[1.02]"
                >
                  <span>Consult a Lawyer</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Statutory Citations & Legal Context Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-surface rounded-2xl p-6 border border-border space-y-3">
          <div className="flex items-center gap-2 text-text-primary font-bold text-sm">
            <Scale className="w-4 h-4 text-accent" />
            <span>Statutory Citation (कानूनी व्यवस्था)</span>
          </div>
          <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
            यस क्यालकुलेटरले <strong>मुलुकी देवानी कार्यविधि संहिता, २०७४ को दफा ६९</strong> मा उल्लेखित फिरादपत्र वा प्रतिउत्तरपत्रमा दाबी गरिएको बिगो बमोजिम लाग्ने अदालती दस्तुरको हिसाब गर्दछ।
          </p>
          <div className="pt-2">
            <a
              href="https://lawcommission.gov.np"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-accent hover:underline"
            >
              <span>Nepal Law Commission Reference</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        <div className="bg-surface rounded-2xl p-6 border border-border space-y-3">
          <div className="flex items-center gap-2 text-text-primary font-bold text-sm">
            <Info className="w-4 h-4 text-amber-500" />
            <span>Legal Disclaimer (कानूनी जानकारी)</span>
          </div>
          <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
            उक्त रकम अनुमानित दस्तुर मात्र हो। मुद्दा दर्ता गर्दा म्याद तामेली खर्च, नक्कल दस्तुर, वादी-प्रतिवादी संख्या, तथा मुद्दाको प्रकृति अनुसार अदालतको रजिष्ट्रार वा स्रेस्तेदारले तोक्ने अन्तिम कोर्ट फी फरक पर्न सक्दछ।
          </p>
        </div>
      </div>
    </div>
  );
}
