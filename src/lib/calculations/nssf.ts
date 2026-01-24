import { NSSF } from '../constants';

/**
 * Calculate NSSF contribution (2024 rates with Upper Earnings Limit of KES 72,000)
 *
 * Formula: IF(salary<=8000, salary*0.06, IF(salary<=72000, 480+(salary-8000)*0.06, 480+(72000-8000)*0.06))
 *
 * Tier I: 6% of pensionable pay up to KES 8,000 (max KES 480)
 * Tier II: 6% of pensionable pay between KES 8,000 and KES 72,000 (max KES 3,840)
 * Total max: KES 4,320 per month (employee) + KES 4,320 (employer)
 */
export function calculateNSSF(grossSalary: number): {
  employee: number;
  employer: number;
} {
  if (grossSalary <= 0) {
    return { employee: 0, employer: 0 };
  }

  let contribution: number;

  if (grossSalary <= NSSF.TIER_I_LIMIT) {
    // Salary up to KES 8,000: 6% of salary
    contribution = grossSalary * NSSF.RATE;
  } else if (grossSalary <= NSSF.UPPER_EARNINGS_LIMIT) {
    // Salary between KES 8,000 and KES 72,000
    // Tier I max (480) + 6% of amount above 8,000
    contribution = NSSF.TIER_I_MAX + (grossSalary - NSSF.TIER_I_LIMIT) * NSSF.RATE;
  } else {
    // Salary above KES 72,000: capped at upper earnings limit
    // Tier I max (480) + 6% of (72,000 - 8,000) = 480 + 3,840 = 4,320
    contribution = NSSF.TIER_I_MAX + (NSSF.UPPER_EARNINGS_LIMIT - NSSF.TIER_I_LIMIT) * NSSF.RATE;
  }

  // Ensure we don't exceed maximum
  const totalContribution = Math.min(contribution, NSSF.MAX_EMPLOYEE_CONTRIBUTION);

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
