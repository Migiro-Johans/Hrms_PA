import { PAYE_TAX_BANDS, PERSONAL_RELIEF, INSURANCE_RELIEF } from '../constants';

/**
 * Calculate PAYE (Pay As You Earn) Tax
 * Uses Kenya's progressive tax bands (2024)
 *
 * Excel Formula:
 * =-(MIN(X,24000)*10%+IF(X>24000,MIN(X-24000,8333)*25%,0)+IF(X>32333,MIN(X-32333,467667)*30%,0)+IF(X>500000,MIN(X-500000,300000)*32.5%,0)+IF(X>800000,(X-800000)*35%,0))
 *
 * Tax Bands:
 * - KES 0 - 24,000: 10%
 * - KES 24,001 - 32,333: 25% (band width: 8,333)
 * - KES 32,334 - 500,000: 30% (band width: 467,667)
 * - KES 500,001 - 800,000: 32.5% (band width: 300,000)
 * - Above KES 800,000: 35%
 */
export function calculatePAYE(
  taxablePay: number,
  insurancePremium: number = 0
): {
  incomeTax: number;
  personalRelief: number;
  insuranceRelief: number;
  paye: number;
} {
  if (taxablePay <= 0) {
    return {
      incomeTax: 0,
      personalRelief: 0,
      insuranceRelief: 0,
      paye: 0,
    };
  }

  // Calculate income tax using the exact Excel formula logic
  let incomeTax = 0;

  // Band 1: First KES 24,000 at 10%
  incomeTax += Math.min(taxablePay, 24000) * 0.10;

  // Band 2: KES 24,001 - 32,333 at 25% (width: 8,333)
  if (taxablePay > 24000) {
    incomeTax += Math.min(taxablePay - 24000, 8333) * 0.25;
  }

  // Band 3: KES 32,334 - 500,000 at 30% (width: 467,667)
  if (taxablePay > 32333) {
    incomeTax += Math.min(taxablePay - 32333, 467667) * 0.30;
  }

  // Band 4: KES 500,001 - 800,000 at 32.5% (width: 300,000)
  if (taxablePay > 500000) {
    incomeTax += Math.min(taxablePay - 500000, 300000) * 0.325;
  }

  // Band 5: Above KES 800,000 at 35%
  if (taxablePay > 800000) {
    incomeTax += (taxablePay - 800000) * 0.35;
  }

  // Personal Relief (KES 2,400 per month)
  const personalRelief = PERSONAL_RELIEF.MONTHLY;

  // Insurance Relief (15% of premium, max KES 5,000 per month)
  let insuranceRelief = 0;
  if (insurancePremium > 0) {
    insuranceRelief = Math.min(
      insurancePremium * INSURANCE_RELIEF.RATE,
      INSURANCE_RELIEF.MAX_MONTHLY
    );
  }

  // PAYE = Income Tax - Personal Relief - Insurance Relief
  // Cannot be negative
  const paye = Math.max(0, incomeTax - personalRelief - insuranceRelief);

  return {
    incomeTax: Math.round(incomeTax * 100) / 100,
    personalRelief: Math.round(personalRelief * 100) / 100,
    insuranceRelief: Math.round(insuranceRelief * 100) / 100,
    paye: Math.round(paye * 100) / 100,
  };
}

/**
 * Calculate taxable pay
 *
 * Excel Formula: =SUM(T:W) where T=Gross, U=SHIF(-), V=AHL(-), W=NSSF(-)
 * Taxable Pay = Gross Pay - SHIF - AHL - NSSF
 *
 * Note: When using positive values for deductions, subtract them.
 * The Excel template stores deductions as negative for easy SUM formulas.
 */
export function calculateTaxablePay(
  grossPay: number,
  shifEmployee: number,
  ahlEmployee: number,
  nssfEmployee: number
): number {
  const taxable = grossPay - shifEmployee - ahlEmployee - nssfEmployee;
  return Math.max(0, Math.round(taxable * 100) / 100);
}

/**
 * Format tax calculation breakdown for display
 */
export function getTaxBreakdown(taxablePay: number): Array<{
  band: string;
  rate: string;
  amount: number;
  tax: number;
}> {
  const breakdown: Array<{
    band: string;
    rate: string;
    amount: number;
    tax: number;
  }> = [];

  let remainingIncome = taxablePay;

  for (const band of PAYE_TAX_BANDS) {
    if (remainingIncome <= 0) break;

    const bandMin = band.min;
    const bandMax = band.max === Infinity ? remainingIncome + bandMin : band.max;
    const bandWidth = bandMax - bandMin + 1;
    const taxableInBand = Math.min(remainingIncome, bandWidth);
    const tax = taxableInBand * band.rate;

    breakdown.push({
      band: band.max === Infinity
        ? `Above KES ${bandMin.toLocaleString()}`
        : `KES ${bandMin.toLocaleString()} - ${bandMax.toLocaleString()}`,
      rate: `${(band.rate * 100).toFixed(0)}%`,
      amount: Math.round(taxableInBand * 100) / 100,
      tax: Math.round(tax * 100) / 100,
    });

    remainingIncome -= taxableInBand;
  }

  return breakdown;
}
