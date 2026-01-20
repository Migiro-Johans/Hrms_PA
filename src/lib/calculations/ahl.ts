import { AHL } from '../constants';

/**
 * Calculate Affordable Housing Levy (AHL)
 * Employee: 1.5% of gross salary
 * Employer: 1.5% of gross salary
 */
export function calculateAHL(grossSalary: number): {
  employee: number;
  employer: number;
} {
  if (grossSalary <= 0) {
    return { employee: 0, employer: 0 };
  }

  const employeeContribution = grossSalary * AHL.EMPLOYEE_RATE;
  const employerContribution = grossSalary * AHL.EMPLOYER_RATE;

  return {
    employee: Math.round(employeeContribution * 100) / 100,
    employer: Math.round(employerContribution * 100) / 100,
  };
}
