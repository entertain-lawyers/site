import { describe, it, expect } from 'vitest';
import { calculateCourtFee, parseClaimAmount, formatNpr, COURT_FEE_SLABS } from '../court-fee';

describe('Court Fee Calculator - Section 69 Muluki Diwani Karyavidhi Samhita 2074', () => {
  describe('Slab Boundary Calculations', () => {
    it('Slab 1: Flat Rs. 500 for claim amounts up to Rs. 25,000', () => {
      // Minimum / nominal positive claim
      const res1 = calculateCourtFee(100);
      expect(res1.totalFee).toBe(500);

      // Mid-slab
      const res2 = calculateCourtFee(15000);
      expect(res2.totalFee).toBe(500);

      // Exact upper boundary of Slab 1
      const res3 = calculateCourtFee(25000);
      expect(res3.totalFee).toBe(500);
      expect(res3.slabs[0].amountInSlab).toBe(25000);
      expect(res3.slabs[0].feeInSlab).toBe(500);
      expect(res3.slabs[1].isApplicable).toBe(false);
    });

    it('Slab 2: 5% on amount exceeding Rs. 25,000 up to Rs. 50,000', () => {
      // Just crossed Slab 1 boundary: 25,001 -> 500 + (1 * 0.05) = 500.05
      const resBoundary = calculateCourtFee(25001);
      expect(resBoundary.totalFee).toBe(500.05);

      // Mid-slab: 35,000 -> 500 + (10,000 * 0.05) = 500 + 500 = 1,000
      const resMid = calculateCourtFee(35000);
      expect(resMid.totalFee).toBe(1000);

      // Exact upper boundary of Slab 2: 50,000 -> 500 + (25,000 * 0.05) = 500 + 1,250 = 1,750
      const resMax = calculateCourtFee(50000);
      expect(resMax.totalFee).toBe(1750);
      expect(resMax.slabs[1].amountInSlab).toBe(25000);
      expect(resMax.slabs[1].feeInSlab).toBe(1250);
      expect(resMax.slabs[2].isApplicable).toBe(false);
    });

    it('Slab 3: 3.5% on amount exceeding Rs. 50,000 up to Rs. 100,000', () => {
      // Just crossed Slab 2 boundary: 50,001 -> 1,750 + (1 * 0.035) = 1,750.04
      const resBoundary = calculateCourtFee(50001);
      expect(resBoundary.totalFee).toBe(1750.04);

      // Mid-slab: 75,000 -> 1,750 + (25,000 * 0.035) = 1,750 + 875 = 2,625
      const resMid = calculateCourtFee(75000);
      expect(resMid.totalFee).toBe(2625);

      // Exact upper boundary of Slab 3: 100,000 -> 1,750 + (50,000 * 0.035) = 1,750 + 1,750 = 3,500
      const resMax = calculateCourtFee(100000);
      expect(resMax.totalFee).toBe(3500);
      expect(resMax.slabs[2].amountInSlab).toBe(50000);
      expect(resMax.slabs[2].feeInSlab).toBe(1750);
      expect(resMax.slabs[3].isApplicable).toBe(false);
    });

    it('Slab 4: 2.0% on amount exceeding Rs. 100,000 up to Rs. 500,000', () => {
      // Just crossed Slab 3 boundary: 100,001 -> 3,500 + (1 * 0.02) = 3,500.02
      const resBoundary = calculateCourtFee(100001);
      expect(resBoundary.totalFee).toBe(3500.02);

      // Mid-slab: 250,000 -> 3,500 + (150,000 * 0.02) = 3,500 + 3,000 = 6,500
      const resMid = calculateCourtFee(250000);
      expect(resMid.totalFee).toBe(6500);

      // Exact upper boundary of Slab 4: 500,000 -> 3,500 + (400,000 * 0.02) = 3,500 + 8,000 = 11,500
      const resMax = calculateCourtFee(500000);
      expect(resMax.totalFee).toBe(11500);
      expect(resMax.slabs[3].amountInSlab).toBe(400000);
      expect(resMax.slabs[3].feeInSlab).toBe(8000);
      expect(resMax.slabs[4].isApplicable).toBe(false);
    });

    it('Slab 5: 1.5% on amount exceeding Rs. 500,000 up to Rs. 2,500,000', () => {
      // Just crossed Slab 4 boundary: 500,001 -> 11,500 + (1 * 0.015) = 11,500.02
      const resBoundary = calculateCourtFee(500001);
      expect(resBoundary.totalFee).toBe(11500.02);

      // Mid-slab: 1,500,000 -> 11,500 + (1,000,000 * 0.015) = 11,500 + 15,000 = 26,500
      const resMid = calculateCourtFee(1500000);
      expect(resMid.totalFee).toBe(26500);

      // Exact upper boundary of Slab 5: 2,500,000 -> 11,500 + (2,000,000 * 0.015) = 11,500 + 30,000 = 41,500
      const resMax = calculateCourtFee(2500000);
      expect(resMax.totalFee).toBe(41500);
      expect(resMax.slabs[4].amountInSlab).toBe(2000000);
      expect(resMax.slabs[4].feeInSlab).toBe(30000);
      expect(resMax.slabs[5].isApplicable).toBe(false);
    });

    it('Slab 6: 1.0% on amount exceeding Rs. 2,500,000', () => {
      // Just crossed Slab 5 boundary: 2,500,001 -> 41,500 + (1 * 0.01) = 41,500.01
      const resBoundary = calculateCourtFee(2500001);
      expect(resBoundary.totalFee).toBe(41500.01);

      // Rs. 5,000,000 (50 Lakhs): 41,500 + (2,500,000 * 0.01) = 41,500 + 25,000 = 66,500
      const res50Lakhs = calculateCourtFee(5000000);
      expect(res50Lakhs.totalFee).toBe(66500);

      // Rs. 10,000,000 (1 Crore): 41,500 + (7,500,000 * 0.01) = 41,500 + 75,000 = 116,500
      const res1Crore = calculateCourtFee(10000000);
      expect(res1Crore.totalFee).toBe(116500);
      expect(res1Crore.slabs[5].amountInSlab).toBe(7500000);
      expect(res1Crore.slabs[5].feeInSlab).toBe(75000);
    });

    it('verifies breakdown items sum up exactly to total fee', () => {
      const amounts = [12000, 35000, 85000, 350000, 1800000, 7500000];
      for (const amount of amounts) {
        const result = calculateCourtFee(amount);
        const sumOfSlabs = result.slabs
          .filter((s) => s.isApplicable)
          .reduce((acc, s) => acc + s.feeInSlab, 0);
        expect(Math.round(sumOfSlabs * 100) / 100).toBe(result.totalFee);
      }
    });
  });

  describe('Input Parsing & Validation', () => {
    it('parses valid numeric strings and formatted numbers with commas', () => {
      expect(parseClaimAmount('25000').value).toBe(25000);
      expect(parseClaimAmount('25,000').value).toBe(25000);
      expect(parseClaimAmount('25,00,000').value).toBe(2500000);
      expect(parseClaimAmount('2,500,000').value).toBe(2500000);
      expect(parseClaimAmount('NPR 1,00,000').value).toBe(100000);
      expect(parseClaimAmount('Rs. 50000').value).toBe(50000);
      expect(parseClaimAmount('रु. 75,000').value).toBe(75000);
      expect(parseClaimAmount(50000).value).toBe(50000);
    });

    it('rejects empty, negative, zero, and invalid inputs with clear messages', () => {
      expect(parseClaimAmount('').error).toBeDefined();
      expect(parseClaimAmount('   ').error).toBeDefined();
      expect(parseClaimAmount('0').error).toBe('Claim amount must be greater than zero.');
      expect(parseClaimAmount(-500).error).toBe('Claim amount must be greater than zero.');
      expect(parseClaimAmount('-25000').error).toBeDefined();
      expect(parseClaimAmount('abc').error).toBe('Please enter a valid numeric claim amount.');
      expect(parseClaimAmount('12.34.56').error).toBe('Please enter a valid numeric claim amount.');
      expect(parseClaimAmount(100_000_000_001).error).toContain('limit');
    });
  });

  describe('Currency Formatting', () => {
    it('formats amounts with Nepali / South Asian comma groupings', () => {
      expect(formatNpr(500, false)).toBe('500');
      expect(formatNpr(25000, false)).toBe('25,000');
      expect(formatNpr(100000, false)).toBe('1,00,000');
      expect(formatNpr(2500000, false)).toBe('25,00,000');
      expect(formatNpr(10000000, false)).toBe('1,00,00,000');
      expect(formatNpr(116500, true)).toBe('1,16,500.00');
    });
  });
});
