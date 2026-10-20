'use client';

import { useState, useId } from 'react';
import Link from 'next/link';
import { Info, ArrowRight, Calculator } from 'lucide-react';
import { calculateCourtFee, formatNpr, parseClaimAmount } from '@/lib/court-fee';

export default function CourtFeeCalculator() {
  const [inputValue, setInputValue] = useState<string>('25000');
  // Results reflect the last committed (Calculate-pressed) amount, following
  // the client's input → calculate → breakdown flow.
  const [committedValue, setCommittedValue] = useState<string | null>(null);
  const inputId = useId();

  const parsed = parseClaimAmount(inputValue);
  const committed = committedValue !== null ? parseClaimAmount(committedValue) : null;
  const calculation =
    committed?.valid && committed.value !== null ? calculateCourtFee(committed.value) : null;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (parsed.valid && parsed.value !== null) {
      setCommittedValue(inputValue);
    }
  };

  const canCalculate = parsed.valid && parsed.value !== null;

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

          {/* Claim Amount Input + Calculate action */}
          <form onSubmit={handleSubmit}>
            <label htmlFor={inputId} className="block text-sm font-bold text-text-primary mb-2">
              Claim Amount (NPR) <span className="text-text-muted font-semibold">/ बिगो वा दाबी रकम</span>
            </label>
            <div className="relative rounded-xl shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-text-muted font-bold text-base">
                Rs.
              </div>
              <input
                id={inputId}
                type="text"
                inputMode="numeric"
                value={inputValue}
                onChange={handleInputChange}
                placeholder="e.g. 500000 or 25,00,000"
                className={`block w-full pl-14 pr-4 py-3.5 text-lg font-bold rounded-xl border bg-background text-text-primary placeholder:text-text-muted/60 focus:outline-none focus:ring-2 transition-all ${
                  !parsed.valid && inputValue.trim() !== ''
                    ? 'border-red-500 focus:ring-red-500/20'
                    : 'border-border focus:ring-accent/30 focus:border-accent'
                }`}
                aria-describedby={!parsed.valid && inputValue.trim() !== '' ? 'input-error' : undefined}
              />
            </div>

            {/* Error prompt */}
            {!parsed.valid && inputValue.trim() !== '' && (
              <p id="input-error" className="mt-2 text-xs font-semibold text-red-500 flex items-center gap-1.5">
                <Info className="w-4 h-4 shrink-0" />
                {parsed.error}
              </p>
            )}

            {/* Explicit Calculate action — per client's input → calculate flow */}
            <button
              type="submit"
              disabled={!canCalculate}
              className="mt-4 w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 min-h-[48px] rounded-xl bg-navy dark:bg-accent text-white text-sm sm:text-base font-bold shadow-md hover:opacity-90 active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <Calculator className="w-5 h-5" />
              Calculate Court Fee
              <span className="text-sm font-semibold opacity-80">(कोर्ट फी गणना)</span>
            </button>
          </form>

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
                        <th className="py-2.5 px-4">Slab Range (दायरा)</th>
                        <th className="py-2.5 px-4">Statutory Rate (दर)</th>
                        <th className="py-2.5 px-4">Claim in Slab (बिगो रकम)</th>
                        <th className="py-2.5 px-4 text-right">Fee Charged (दस्तुर)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {applicableRows.map((row) => (
                        <tr key={row.slabId} className="text-text-primary">
                          <td className="py-2.5 px-4">
                            <div className="font-bold">{row.rangeLabel}</div>
                            <div className="text-xs text-text-muted">{row.rangeLabelNepali}</div>
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
                          Total <span className="font-semibold text-text-muted">(जम्मा)</span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-navy dark:text-[#ddba76]">
                          रु. {formatNpr(calculation.totalFee)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
                <p className="text-[11px] text-text-muted leading-relaxed">
                  This is an indicative fee only. Deadline/stamp charges, copy fees, and the final court fee determined by the court&apos;s registrar or srasta-dar may differ depending on the nature of the case.
                  <span className="block">उक्त रकम अनुमानित दस्तुर मात्र हो। म्याद तामेली खर्च, नक्कल दस्तुर तथा मुद्दाको प्रकृति अनुसार अदालतको रजिष्ट्रार वा स्रेस्तेदारले तोक्ने अन्तिम कोर्ट फी फरक पर्न सक्दछ।</span>
                  Reference:{' '}
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
