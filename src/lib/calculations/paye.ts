import { PAYE_TAX_BANDS, PERSONAL_RELIEF, INSURANCE_RELIEF } from '../constants';

/**
 * Calculate PAYE (Pay As You Earn) Tax
 * Uses Kenya's progressive tax bands
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

  // Calculate income tax using progressive bands
  let incomeTax = 0;
  let remainingIncome = taxablePay;

  for (const band of PAYE_TAX_BANDS) {
    if (remainingIncome <= 0) break;

    const bandWidth = band.max === Infinity ? remainingIncome : band.max - band.min + 1;
    const taxableInBand = Math.min(remainingIncome, bandWidth);

    incomeTax += taxableInBand * band.rate;
    remainingIncome -= taxableInBand;
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
 * Taxable Pay = Gross Pay - NSSF (Employee contribution)
 */
export function calculateTaxablePay(
  grossPay: number,
  nssfEmployee: number
): number {
  const taxable = grossPay - nssfEmployee;
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
