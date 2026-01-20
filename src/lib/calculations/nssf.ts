import { NSSF } from '../constants';

/**
 * Calculate NSSF contribution (New NSSF Act)
 * Tier I: 6% of pensionable pay up to KES 7,000 (max KES 420)
 * Tier II: 6% of pensionable pay between KES 7,000 and KES 36,000 (max KES 1,740)
 * Total max: KES 2,160 per month (employee) + KES 2,160 (employer)
 */
export function calculateNSSF(basicSalary: number): {
  employee: number;
  employer: number;
} {
  if (basicSalary <= 0) {
    return { employee: 0, employer: 0 };
  }

  let tierI = 0;
  let tierII = 0;

  // Tier I: 6% of pensionable pay up to KES 7,000
  if (basicSalary > 0) {
    const tierIBase = Math.min(basicSalary, NSSF.TIER_I_LIMIT);
    tierI = tierIBase * NSSF.RATE;
  }

  // Tier II: 6% of pensionable pay between KES 7,000 and KES 36,000
  if (basicSalary > NSSF.TIER_I_LIMIT) {
    const tierIIBase = Math.min(
      basicSalary - NSSF.TIER_I_LIMIT,
      NSSF.TIER_II_UPPER_LIMIT - NSSF.TIER_I_LIMIT
    );
    tierII = tierIIBase * NSSF.RATE;
  }

  const totalContribution = Math.min(tierI + tierII, NSSF.MAX_EMPLOYEE_CONTRIBUTION);

  // Round to 2 decimal places
  const employeeContribution = Math.round(totalContribution * 100) / 100;
  const employerContribution = Math.round(totalContribution * 100) / 100;

  return {
    employee: employeeContribution,
    employer: employerContribution,
  };
}

/**
 * Calculate maximum NSSF deduction for P9 (30% of basic salary or actual)
 */
export function calculateNSSFForP9(
  basicSalary: number,
  actualContribution: number
): {
  thirtyPercent: number;
  actual: number;
  allowable: number;
} {
  const thirtyPercent = basicSalary * 0.3;
  const allowable = Math.min(thirtyPercent, actualContribution);

  return {
    thirtyPercent: Math.round(thirtyPercent * 100) / 100,
    actual: Math.round(actualContribution * 100) / 100,
    allowable: Math.round(allowable * 100) / 100,
  };
}
