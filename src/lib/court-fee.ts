/**
 * Court Fee Calculation Engine for Nepal
 *
 * Statutory Reference:
 * National Civil Procedure (Code) Act, 2017 (Muluki Diwani Karyavidhi Samhita, 2074), Section 69.
 * Nepal Law Commission: https://lawcommission.gov.np
 *
 * Section 69 Statutory Progressive Slabs for Monetary Claims:
 * 1. Up to NPR 25,000                   : Fixed NPR 500
 * 2. NPR 25,001 to NPR 50,000          : 5.0% on the amount exceeding NPR 25,000 (Max: NPR 1,250)
 * 3. NPR 50,001 to NPR 100,000         : 3.5% on the amount exceeding NPR 50,000 (Max: NPR 1,750)
 * 4. NPR 100,001 to NPR 500,000        : 2.0% on the amount exceeding NPR 100,000 (Max: NPR 8,000)
 * 5. NPR 500,001 to NPR 2,500,000      : 1.5% on the amount exceeding NPR 500,000 (Max: NPR 30,000)
 * 6. Above NPR 2,500,000               : 1.0% on the amount exceeding NPR 2,500,000
 */

export interface CourtFeeSlabDefinition {
  id: string;
  min: number;
  max: number | null;
  rateType: 'fixed' | 'percentage';
  rateValue: number; // 500 for fixed, 0.05 for 5%, etc.
  rateLabel: string;
  rangeLabel: string;
  rangeLabelNepali: string;
}

export interface SlabBreakdownItem {
  slabId: string;
  rangeLabel: string;
  rangeLabelNepali: string;
  rateLabel: string;
  amountInSlab: number;
  feeInSlab: number;
  calculationNote: string;
  isApplicable: boolean;
}

export interface CourtFeeCalculationResult {
  claimAmount: number;
  totalFee: number;
  effectiveRatePercentage: number;
  effectiveRatePercent: number;
  slabs: SlabBreakdownItem[];
  breakdown: SlabBreakdownItem[];
  formattedClaimAmount: string;
  formattedTotalFee: string;
}

export const COURT_FEE_SLABS: CourtFeeSlabDefinition[] = [
  {
    id: 'slab_1',
    min: 0,
    max: 25000,
    rateType: 'fixed',
    rateValue: 500,
    rateLabel: 'Fixed Rs. 500',
    rangeLabel: 'Up to Rs. 25,000',
    rangeLabelNepali: 'रु. २५,००० सम्म',
  },
  {
    id: 'slab_2',
    min: 25000,
    max: 50000,
    rateType: 'percentage',
    rateValue: 0.05,
    rateLabel: '5.0%',
    rangeLabel: 'Rs. 25,001 to Rs. 50,000',
    rangeLabelNepali: 'रु. २५,००१ देखि रु. ५०,००० सम्म',
  },
  {
    id: 'slab_3',
    min: 50000,
    max: 100000,
    rateType: 'percentage',
    rateValue: 0.035,
    rateLabel: '3.5%',
    rangeLabel: 'Rs. 50,001 to Rs. 100,000',
    rangeLabelNepali: 'रु. ५०,००१ देखि रु. १,००,००० सम्म',
  },
  {
    id: 'slab_4',
    min: 100000,
    max: 500000,
    rateType: 'percentage',
    rateValue: 0.02,
    rateLabel: '2.0%',
    rangeLabel: 'Rs. 100,001 to Rs. 500,000',
    rangeLabelNepali: 'रु. १,००,००१ देखि रु. ५,००,००० सम्म',
  },
  {
    id: 'slab_5',
    min: 500000,
    max: 2500000,
    rateType: 'percentage',
    rateValue: 0.015,
    rateLabel: '1.5%',
    rangeLabel: 'Rs. 500,001 to Rs. 2,500,000',
    rangeLabelNepali: 'रु. ५,००,००१ देखि रु. २५,००,००० सम्म',
  },
  {
    id: 'slab_6',
    min: 2500000,
    max: null,
    rateType: 'percentage',
    rateValue: 0.01,
    rateLabel: '1.0%',
    rangeLabel: 'Above Rs. 2,500,000',
    rangeLabelNepali: 'रु. २५,००,००० भन्दा माथि',
  },
];

/**
 * Format a number into standard Nepalese currency format with commas.
 * (e.g. 2500000 -> "25,00,000" or standard "2,500,000.00")
 */
export function formatNpr(amount: number, includeDecimals = true): string {
  if (isNaN(amount) || amount === null || amount === undefined) return '0.00';
  
  const rounded = Math.round(amount * 100) / 100;
  const parts = rounded.toFixed(includeDecimals ? 2 : 0).split('.');
  let integerPart = parts[0];
  const decimalPart = parts[1];

  // Apply South Asian numbering grouping: last 3 digits, then groups of 2
  if (integerPart.length > 3) {
    const lastThree = integerPart.substring(integerPart.length - 3);
    const otherNumbers = integerPart.substring(0, integerPart.length - 3);
    const formattedOther = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
    integerPart = formattedOther + ',' + lastThree;
  }

  return includeDecimals && decimalPart ? `${integerPart}.${decimalPart}` : integerPart;
}

/**
 * Clean and parse a user input string into a valid positive number.
 * Returns null if the input is invalid or negative.
 */
export function parseClaimAmount(input: string | number): { valid: boolean; value: number | null; error?: string } {
  if (typeof input === 'number') {
    if (isNaN(input) || !isFinite(input)) return { valid: false, value: null, error: 'Please enter a valid number.' };
    if (input <= 0) return { valid: false, value: null, error: 'Claim amount must be greater than zero.' };
    if (input > 100_000_000_000) return { valid: false, value: null, error: 'Claim amount exceeds maximum supported calculation limit.' };
    return { valid: true, value: input };
  }

  if (typeof input !== 'string') {
    return { valid: false, value: null, error: 'Invalid input type.' };
  }

  const trimmed = input.trim();
  if (!trimmed) {
    return { valid: false, value: null, error: 'Please enter a claim amount.' };
  }

  // Remove commas, spaces, currency symbols (Rs, NPR, रु)
  const cleaned = trimmed.replace(/,/g, '').replace(/NPR/gi, '').replace(/Rs\.?/gi, '').replace(/रु\.?/g, '').trim();

  if (!/^\d+(\.\d+)?$/.test(cleaned)) {
    return { valid: false, value: null, error: 'Please enter a valid numeric claim amount.' };
  }

  const num = parseFloat(cleaned);
  if (isNaN(num) || !isFinite(num)) {
    return { valid: false, value: null, error: 'Please enter a valid numeric claim amount.' };
  }

  if (num <= 0) {
    return { valid: false, value: null, error: 'Claim amount must be greater than zero.' };
  }

  if (num > 100_000_000_000) {
    return { valid: false, value: null, error: 'Claim amount exceeds maximum supported calculation limit.' };
  }

  return { valid: true, value: num };
}

/**
 * Calculate progressive court fee according to Section 69 of the National Civil Procedure (Code) Act, 2017.
 */
export function calculateCourtFee(claimAmount: number): CourtFeeCalculationResult {
  if (claimAmount <= 0) {
    const emptySlabs = COURT_FEE_SLABS.map((s) => ({
      slabId: s.id,
      rangeLabel: s.rangeLabel,
      rangeLabelNepali: s.rangeLabelNepali,
      rateLabel: s.rateLabel,
      amountInSlab: 0,
      feeInSlab: 0,
      calculationNote: 'Not applicable',
      isApplicable: false,
    }));
    return {
      claimAmount: 0,
      totalFee: 0,
      effectiveRatePercentage: 0,
      effectiveRatePercent: 0,
      slabs: emptySlabs,
      breakdown: emptySlabs,
      formattedClaimAmount: '0.00',
      formattedTotalFee: '0.00',
    };
  }

  let cumulativeFee = 0;
  const slabsBreakdown: SlabBreakdownItem[] = [];

  for (const slab of COURT_FEE_SLABS) {
    if (slab.rateType === 'fixed') {
      // Slab 1: Up to 25,000 -> Fixed 500
      const amountInSlab = Math.min(claimAmount, slab.max!);
      const feeInSlab = 500;
      cumulativeFee += feeInSlab;

      slabsBreakdown.push({
        slabId: slab.id,
        rangeLabel: slab.rangeLabel,
        rangeLabelNepali: slab.rangeLabelNepali,
        rateLabel: slab.rateLabel,
        amountInSlab,
        feeInSlab,
        calculationNote: `Fixed statutory fee for claims up to Rs. 25,000`,
        isApplicable: true,
      });
    } else {
      // Progressive percentage slab
      if (claimAmount > slab.min) {
        const slabCeiling = slab.max !== null ? slab.max : claimAmount;
        const applicableAmount = Math.min(claimAmount, slabCeiling) - slab.min;
        const feeInSlab = applicableAmount * slab.rateValue;
        cumulativeFee += feeInSlab;

        slabsBreakdown.push({
          slabId: slab.id,
          rangeLabel: slab.rangeLabel,
          rangeLabelNepali: slab.rangeLabelNepali,
          rateLabel: slab.rateLabel,
          amountInSlab: applicableAmount,
          feeInSlab: Math.round(feeInSlab * 100) / 100,
          calculationNote: `${slab.rateLabel} of Rs. ${formatNpr(applicableAmount, false)}`,
          isApplicable: true,
        });
      } else {
        slabsBreakdown.push({
          slabId: slab.id,
          rangeLabel: slab.rangeLabel,
          rangeLabelNepali: slab.rangeLabelNepali,
          rateLabel: slab.rateLabel,
          amountInSlab: 0,
          feeInSlab: 0,
          calculationNote: 'Not reached',
          isApplicable: false,
        });
      }
    }
  }

  const roundedTotalFee = Math.round(cumulativeFee * 100) / 100;
  const effectiveRate = claimAmount > 0 ? (roundedTotalFee / claimAmount) * 100 : 0;

  return {
    claimAmount,
    totalFee: roundedTotalFee,
    effectiveRatePercentage: Math.round(effectiveRate * 100) / 100,
    effectiveRatePercent: Math.round(effectiveRate * 100) / 100,
    slabs: slabsBreakdown,
    breakdown: slabsBreakdown,
    formattedClaimAmount: formatNpr(claimAmount),
    formattedTotalFee: formatNpr(roundedTotalFee),
  };
}
