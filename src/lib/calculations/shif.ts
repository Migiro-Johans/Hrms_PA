import { SHIF } from '../constants';

/**
 * Calculate SHIF (Social Health Insurance Fund) contribution
 * Rate: 2.75% of gross salary
 * This replaces the old NHIF system
 */
export function calculateSHIF(grossSalary: number): number {
  if (grossSalary <= 0) {
    return 0;
  }

  const contribution = grossSalary * SHIF.RATE;

  // Round to 2 decimal places
  return Math.round(contribution * 100) / 100;
}

/**
 * Old NHIF rates (for reference/legacy support)
 * These are no longer in use but kept for historical records
 */
export const OLD_NHIF_RATES = [
  { min: 0, max: 5999, amount: 150 },
  { min: 6000, max: 7999, amount: 300 },
  { min: 8000, max: 11999, amount: 400 },
  { min: 12000, max: 14999, amount: 500 },
  { min: 15000, max: 19999, amount: 600 },
  { min: 20000, max: 24999, amount: 750 },
  { min: 25000, max: 29999, amount: 850 },
  { min: 30000, max: 34999, amount: 900 },
  { min: 35000, max: 39999, amount: 950 },
  { min: 40000, max: 44999, amount: 1000 },
  { min: 45000, max: 49999, amount: 1100 },
  { min: 50000, max: 59999, amount: 1200 },
  { min: 60000, max: 69999, amount: 1300 },
  { min: 70000, max: 79999, amount: 1400 },
  { min: 80000, max: 89999, amount: 1500 },
  { min: 90000, max: 99999, amount: 1600 },
  { min: 100000, max: Infinity, amount: 1700 },
] as const;

/**
 * Calculate old NHIF amount (for legacy/historical records)
 */
export function calculateOldNHIF(grossSalary: number): number {
  if (grossSalary <= 0) {
    return 0;
  }

  const bracket = OLD_NHIF_RATES.find(
    (rate) => grossSalary >= rate.min && grossSalary <= rate.max
  );

  return bracket ? bracket.amount : 1700;
}
