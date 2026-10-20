'use client';

import { useState, useId, useTransition } from 'react';
import Link from 'next/link';
import { Info, ArrowRight } from 'lucide-react';
import { calculateCourtFee, formatNpr, parseClaimAmount } from '@/lib/court-fee';

const PRESET_AMOUNTS = [
  { label: 'रु. २५,०००', value: 25000 },
  { label: 'रु. १,००,०००', value: 100000 },
  { label: 'रु. ५,००,०००', value: 500000 },
  { label: 'रु. २५,००,०००', value: 2500000 },
  { label: 'रु. १,००,००,०००', value: 10000000 },
];

export default function CourtFeeCalculator() {
  const [inputValue, setInputValue] = useState<string>('25000');
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

  const applicableRows = calculation ? calculation.breakdown.filter((row) => row.isApplicable) : [];

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6">
      <div className="bg-surface rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="p-6 sm:p-8 space-y-6">
          {/* Header — clean title per client sketch */}
          <div className="space-y-1.5">
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-navy dark:text-white">
              Calculate Your Court Fee
            </h2>
            <p className="text-sm text-text-secondary">
              Pursuant to Section 69, National Civil Procedure Code, 2074
              <span className="text-text-muted"> (मुलुकी देवानी कार्यविधि संहिता, २०७४)</span>
            </p>
          </div>

          {/* Claim Amount Input */}
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

            {/* Quick presets */}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-text-muted mr-1">Quick presets:</span>
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
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Result */}
          {calculation && (
            <div className="space-y-5 pt-1">
              {/* Total — single prominent figure with claim context */}
              <div className="rounded-xl bg-navy text-white px-5 sm:px-6 py-4 sm:py-5 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-[#ddba76]">
                    Total Court Fee (जम्मा कोर्ट फी)
                  </div>
                  <div className="text-2xl sm:text-3xl font-black">
                    रु. {formatNpr(calculation.totalFee)}
                  </div>
                </div>
                <div className="text-xs text-white/80 sm:text-right space-y-0.5">
                  <div>Claim (बिगो): रु. {formatNpr(calculation.claimAmount)}</div>
                  <div>Effective rate: {calculation.effectiveRatePercent.toFixed(2)}%</div>
                </div>
              </div>

              {/* Slab by Slab Breakup — only the applicable slabs */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-text-primary">
                  Slab by Slab Breakup <span className="text-text-muted font-medium">(दफा ६९ अनुसार)</span>
                </h3>
                <div className="overflow-x-auto rounded-xl border border-border">
                  <table className="w-full text-left text-xs sm:text-sm border-collapse">
                    <thead>
                      <tr className="bg-surface-alt border-b border-border text-text-muted font-bold text-xs">
                        <th className="py-2.5 px-4">Range (दायरा)</th>
                        <th className="py-2.5 px-4">Rate (दर)</th>
                        <th className="py-2.5 px-4">Amount in Slab</th>
                        <th className="py-2.5 px-4 text-right">Court Fee (दस्तुर)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {applicableRows.map((row) => (
                        <tr key={row.slabId} className="text-text-primary">
                          <td className="py-2.5 px-4">
                            <div className="font-bold">{row.rangeLabelNepali}</div>
                            <div className="text-xs text-text-muted">{row.rangeLabel}</div>
                          </td>
                          <td className="py-2.5 px-4 font-mono">{row.rateLabel}</td>
                          <td className="py-2.5 px-4 font-mono">रु. {formatNpr(row.amountInSlab)}</td>
                          <td className="py-2.5 px-4 text-right font-mono font-bold">
                            रु. {formatNpr(row.feeInSlab)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-surface-alt font-black text-text-primary border-t-2 border-border">
                        <td colSpan={3} className="py-3 px-4 text-right">
                          जम्मा (Total)
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-navy dark:text-[#ddba76]">
                          रु. {formatNpr(calculation.totalFee)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
                <p className="text-[11px] text-text-muted leading-relaxed">
                  उक्त रकम अनुमानित दस्तुर मात्र हो। म्याद तामेली खर्च, नक्कल दस्तुर तथा मुद्दाको प्रकृति अनुसार अदालतको रजिष्ट्रार वा स्रेस्तेदारले तोक्ने अन्तिम कोर्ट फी फरक पर्न सक्दछ। Reference:{' '}
                  <a
                    href="https://lawcommission.gov.np"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold text-accent hover:underline"
                  >
                    Nepal Law Commission
                  </a>
                </p>
              </div>

              {/* Single simple CTA — per client sketch */}
              <div className="flex justify-center pt-1">
                <Link
                  href={consultationHref}
                  className="inline-flex items-center gap-2 px-6 py-3 min-h-[44px] rounded-full bg-accent hover:bg-accent-hover text-white text-sm font-bold shadow-md transition-all hover:scale-[1.02]"
                >
                  <span>Consult a Lawyer</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
