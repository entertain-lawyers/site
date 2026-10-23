'use client';

import { useState, useId, useTransition } from 'react';
import {
  Calculator,
  Scale,
  Receipt,
  Info,
  CheckCircle2
} from 'lucide-react';
import { calculateCourtFee, formatNpr, parseClaimAmount } from '@/lib/court-fee';

const PRESET_AMOUNTS = [
  { label: 'Rs. 25,000', value: 25000, desc: 'Minimum slab' },
  { label: 'Rs. 1,00,000', value: 100000, desc: '1 lakh' },
  { label: 'Rs. 5,00,000', value: 500000, desc: '5 lakh' },
  { label: 'Rs. 25,00,000', value: 2500000, desc: '25 lakh' },
  { label: 'Rs. 1,00,00,000', value: 10000000, desc: '1 crore' },
];

/**
 * Renders a slab range such as "Rs. 25,001 to Rs. 50,000" with extra breathing
 * room around the connector, so long ranges stay easy to scan on small screens.
 */
function RangeLabel({ label, className = '' }: { label: string; className?: string }) {
  const [from, to] = label.split(' to ');

  if (!to) {
    return <div className={className}>{label}</div>;
  }

  return (
    <div className={className}>
      {from}{' '}
      <span className="mx-1 font-semibold opacity-90">to</span>{' '}
      {to}
    </div>
  );
}

export default function CourtFeeCalculator() {
  const [inputValue, setInputValue] = useState<string>('500000');
  const inputId = useId();
  const [, startTransition] = useTransition();

  const parsed = parseClaimAmount(inputValue);
  const calculation = parsed.valid && parsed.value !== null ? calculateCourtFee(parsed.value) : null;
  const hasError = !parsed.valid && inputValue.trim() !== '';

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    startTransition(() => {
      setInputValue(val);
    });
  };

  const handlePresetClick = (amount: number) => {
    setInputValue(amount.toString());
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 sm:space-y-8">
      {/* Calculator Main Box */}
      <div className="bg-surface rounded-2xl border border-border shadow-lg overflow-hidden">
        {/* Header bar */}
        <div className="bg-navy px-4 py-4 sm:px-6 sm:py-5 text-white flex flex-wrap items-center justify-between gap-3 sm:gap-4 border-b border-border/20">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 sm:p-2.5 rounded-xl bg-accent/20 text-[#ddba76] border border-[#ddba76]/30 shrink-0">
              <Calculator className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <h2 className="text-[clamp(1.125rem,1.5vw,1.25rem)] font-bold tracking-tight">
                Calculate Your Court Fee
                <span lang="ne" className="block text-[13px] sm:text-sm font-semibold tracking-normal text-white/80 mt-0.5 sm:mt-1">
                  तपाईंको कोर्ट फी हिसाब गर्नुहोस्
                </span>
              </h2>
              <p className="text-xs text-white/70 mt-0.5 sm:mt-1 leading-snug">
                Pursuant to Section 69, National Civil Procedure (Code) Act, 2017
              </p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full bg-white/10 text-white/90">
            <Scale className="w-3.5 h-3.5 text-[#ddba76]" />
            <span>Nepal Civil Law</span>
          </div>
        </div>

        <div className="p-4 sm:p-8 space-y-5 sm:space-y-6">
          {/* Claim Amount Input Section */}
          <div>
            <label htmlFor={inputId} className="block text-sm font-bold text-text-primary mb-1.5 sm:mb-2">
              Claim Amount / बिगो वा दाबी रकम (NPR)
            </label>
            <div className="relative rounded-xl shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3.5 sm:pl-4 flex items-center pointer-events-none text-text-muted font-bold text-base">
                Rs.
              </div>
              <input
                id={inputId}
                type="text"
                inputMode="numeric"
                value={inputValue}
                onChange={handleInputChange}
                onFocus={(e) => e.currentTarget.select()}
                placeholder="उदा. 500000 वा 25,00,000"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                enterKeyHint="done"
                aria-invalid={hasError}
                aria-describedby={hasError ? 'input-error' : undefined}
                className={`block w-full pl-12 sm:pl-14 pr-3.5 sm:pr-4 py-3.5 text-lg font-bold tabular-nums rounded-xl border bg-background text-text-primary placeholder:text-text-muted/60 focus:outline-none focus:ring-2 transition-all ${
                  hasError
                    ? 'border-red-500 focus:ring-red-500/20'
                    : 'border-border focus:ring-accent/30 focus:border-accent'
                }`}
              />
            </div>

            {/* Error prompt */}
            {hasError && (
              <p id="input-error" className="mt-2 text-xs font-semibold text-red-500 flex items-center gap-1.5">
                <Info className="w-4 h-4 shrink-0" />
                {parsed.error}
              </p>
            )}

            {/* Presets — one swipeable row on phones, wrapped row on desktop */}
            <div className="mt-3 sm:mt-4 -mx-4 sm:mx-0 overflow-x-auto px-4 sm:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <div className="flex items-center gap-2 min-w-max" role="group" aria-label="Quick preset claim amounts">
                <span className="text-[11px] sm:text-xs font-medium text-text-muted mr-1 shrink-0">Quick Presets:</span>
                {PRESET_AMOUNTS.map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => handlePresetClick(preset.value)}
                    aria-pressed={parsed.valid && parsed.value === preset.value}
                    className={`shrink-0 min-h-[44px] px-3.5 py-2 rounded-lg text-[13px] sm:text-xs font-bold tabular-nums transition-all border touch-manipulation active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
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
          </div>

          {/* Results Display */}
          {calculation && (
            <div className="space-y-5 sm:space-y-6 pt-1 sm:pt-2">
              {/* Highlight summary card — fee first on phones, middle on desktop */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 p-4 sm:p-6 rounded-2xl bg-gradient-to-br from-surface-alt to-surface border border-border">
                <div className="col-span-2 md:col-span-1 md:order-2 rounded-xl bg-accent/[0.04] ring-1 ring-accent/10 p-3 md:p-0 md:bg-transparent md:ring-0 md:border-l md:border-border md:pl-6">
                  <div className="text-[11px] sm:text-xs font-bold uppercase tracking-wide sm:tracking-wider text-accent leading-tight">
                    Total Court Fee (जम्मा कोर्ट फी)
                  </div>
                  <div
                    className="mt-0.5 text-[clamp(1.5rem,3vw,1.875rem)] font-black tabular-nums text-navy dark:text-[#ddba76]"
                    aria-live="polite"
                    aria-atomic="true"
                  >
                    रु. {formatNpr(calculation.totalFee)}
                  </div>
                  <div className="mt-0.5 text-[11px] sm:text-xs text-text-muted flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-500 shrink-0" />
                    Statutory progressive rate
                  </div>
                </div>

                <div className="md:order-1 min-w-0">
                  <div className="text-[11px] sm:text-xs font-bold uppercase tracking-wide sm:tracking-wider text-text-muted leading-tight">
                    Total Claim (बिगो रकम)
                  </div>
                  <div className="mt-0.5 text-sm min-[360px]:text-base sm:text-2xl font-black tabular-nums text-text-primary">
                    रु. {formatNpr(calculation.claimAmount)}
                  </div>
                  <div className="mt-0.5 text-[11px] sm:text-xs text-text-muted">Assessed Valuation</div>
                </div>

                <div className="md:order-3 min-w-0">
                  <div className="text-[11px] sm:text-xs font-bold uppercase tracking-wide sm:tracking-wider text-text-muted leading-tight">
                    Effective Rate (प्रभावकारी दर)
                  </div>
                  <div className="mt-0.5 text-sm min-[360px]:text-base sm:text-2xl font-black tabular-nums text-text-primary">
                    {calculation.effectiveRatePercent.toFixed(2)}%
                  </div>
                  <div className="mt-0.5 text-[11px] sm:text-xs text-text-muted">Relative to total claim</div>
                </div>
              </div>

              {/* Progressive Slabs Breakdown */}
              <div className="space-y-3">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <h3 className="text-sm font-bold text-text-primary flex items-center gap-2 leading-snug">
                    <Receipt className="w-4 h-4 text-accent shrink-0" />
                    Slab-by-Slab Statutory Breakdown (As per Section 69)
                  </h3>
                  <span className="text-[11px] sm:text-xs text-text-muted">Progressive Calculation</span>
                </div>

                {/* Desktop table */}
                <div className="hidden md:block overflow-x-auto rounded-xl border border-border">
                  <table className="w-full text-left text-xs sm:text-sm border-collapse">
                    <caption className="sr-only">Court fee slab breakdown under Section 69</caption>
                    <thead>
                      <tr className="bg-surface-alt border-b border-border text-text-muted font-bold text-xs">
                        <th scope="col" className="py-3 px-4">Slab / दायरा</th>
                        <th scope="col" className="py-3 px-4">Statutory Rate / दर</th>
                        <th scope="col" className="py-3 px-4">Applicable In Slab / दाबी रकम</th>
                        <th scope="col" className="py-3 px-4 text-right">Fee / दस्तुर (रु.)</th>
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
                            <RangeLabel label={row.rangeLabel} className="font-bold" />
                            <div lang="ne" className="text-xs opacity-75">{row.rangeLabelNepali}</div>
                          </td>
                          <td className="py-3 px-4 tabular-nums font-medium">{row.rateLabel}</td>
                          <td className="py-3 px-4 tabular-nums">
                            {row.amountInSlab > 0 ? `रु. ${formatNpr(row.amountInSlab)}` : '—'}
                          </td>
                          <td className="py-3 px-4 text-right tabular-nums font-bold">
                            {row.feeInSlab > 0 ? `रु. ${formatNpr(row.feeInSlab)}` : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-surface-alt font-black text-text-primary border-t-2 border-border">
                        <td colSpan={3} className="py-3.5 px-4 text-right">
                          Total Statutory Court Fee (कुल अदालती दस्तुर):
                        </td>
                        <td className="py-3.5 px-4 text-right tabular-nums text-base text-navy dark:text-[#ddba76]">
                          रु. {formatNpr(calculation.totalFee)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Mobile slab cards — no horizontal scrolling needed on a phone */}
                <div className="md:hidden rounded-xl border border-border overflow-hidden divide-y divide-border">
                  {calculation.breakdown.map((row) => (
                    <div
                      key={row.slabId}
                      className={`p-3.5 transition-colors ${
                        row.isApplicable ? 'bg-accent/5' : 'text-text-muted opacity-60'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <RangeLabel label={row.rangeLabel} className="text-sm font-bold leading-snug" />
                          <div lang="ne" className="mt-0.5 text-xs leading-snug opacity-75">{row.rangeLabelNepali}</div>
                        </div>
                        <div className="shrink-0 text-right">
                          <div className="text-sm font-bold tabular-nums">
                            {row.feeInSlab > 0 ? `रु. ${formatNpr(row.feeInSlab)}` : '—'}
                          </div>
                          <div className="mt-0.5 text-[11px] tabular-nums opacity-75">{row.rateLabel}</div>
                        </div>
                      </div>
                      <div className="mt-1 text-[11px] tabular-nums opacity-75">
                        {row.amountInSlab > 0 ? `Amount in slab: रु. ${formatNpr(row.amountInSlab)}` : 'Not applicable'}
                      </div>
                    </div>
                  ))}
                  <div className="flex items-center justify-between gap-3 bg-surface-alt p-3.5">
                    <div className="min-w-0">
                      <div className="text-[13px] font-bold text-text-primary">Total Statutory Court Fee</div>
                      <div lang="ne" className="text-[11px] text-text-muted">कुल अदालती दस्तुर</div>
                    </div>
                    <div className="shrink-0 text-lg font-black tabular-nums text-navy dark:text-[#ddba76]">
                      रु. {formatNpr(calculation.totalFee)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
