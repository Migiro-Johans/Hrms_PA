import { calculateNSSF } from './nssf';
import { calculateSHIF } from './shif';
import { calculateAHL } from './ahl';
import { calculatePAYE, calculateTaxablePay } from './paye';
import { NITA } from '../constants';
import type { PayrollInput, PayrollCalculation } from '@/types';

/**
 * Calculate complete payroll for an employee
 * This is the main function that orchestrates all statutory deductions
 *
 * Follows the Kenyan payroll template formulas:
 * - Gross Payable = SUM(Basic, Car, Meal, Tel) / CalendarDays * DaysWorked
 * - SHIF = 2.75% of Gross (negative)
 * - AHL Employee = 1.5% of Gross (negative)
 * - NSSF Employee = 6% tiered up to KES 72,000 limit (negative)
 * - Taxable Pay = Gross + SHIF + AHL + NSSF (deductions are negative)
 * - Income Tax = Progressive PAYE bands (negative)
 * - Personal Relief = KES 2,400
 * - PAYE = Income Tax + Personal Relief
 * - Net Payable = Taxable Pay + PAYE
 * - Final Net Pay = Net Payable + HELB + Other Deductions
 * - NITA Employer = KES 50
 * - NSSF Employer = matches employee
 * - AHL Employer = matches employee
 * - Cost to Company = Gross + NITA + NSSF Employer + AHL Employer
 */
export function calculatePayroll(input: PayrollInput): PayrollCalculation {
  // Extract input values with defaults
  const basicSalary = input.basic_salary || 0;
  const carAllowance = input.car_allowance || 0;
  const mealAllowance = input.meal_allowance || 0;
  const telephoneAllowance = input.telephone_allowance || 0;
  const housingAllowance = input.housing_allowance || 0;
  const otherAllowances = input.other_allowances || {};
  const otherDeductions = input.other_deductions || {};
  const helb = input.helb || 0;
  const insurancePremium = input.insurance_premium || 0;

  // Proration support (optional)
  const calendarDays = input.calendar_days || 0;
  const daysWorked = input.days_worked || 0;

  // Calculate total other allowances
  const totalOtherAllowances = Object.values(otherAllowances).reduce(
    (sum, val) => sum + (val || 0),
    0
  );

  // Calculate base total (before proration)
  const baseTotal =
    basicSalary +
    carAllowance +
    mealAllowance +
    telephoneAllowance +
    housingAllowance +
    totalOtherAllowances;

  // Calculate Gross Pay (with proration if applicable)
  // Excel Formula: =SUM(P:S)/N*O
  let grossPay: number;
  if (calendarDays > 0 && daysWorked > 0 && daysWorked < calendarDays) {
    // Prorated: (Total Allowances / Calendar Days) * Days Worked
    grossPay = (baseTotal / calendarDays) * daysWorked;
  } else {
    // Full month
    grossPay = baseTotal;
  }

  // Calculate NSSF (based on gross salary per template)
  // Excel Formula: =-IF(T<=8000,T*0.06,IF(T<=72000,480+(T-8000)*0.06,480+(72000-8000)*0.06))
  const nssf = calculateNSSF(grossPay);

  // Calculate SHIF (2.75% of gross salary)
  // Excel Formula: =-T*0.0275
  const shifEmployee = calculateSHIF(grossPay);

  // Calculate AHL (1.5% of gross salary)
  // Excel Formula: =-T*0.015
  const ahl = calculateAHL(grossPay);

  // Calculate Taxable Pay (Gross - SHIF - AHL - NSSF)
  // Excel Formula: =SUM(T:W) where deductions are negative
  const taxablePay = calculateTaxablePay(grossPay, shifEmployee, ahl.employee, nssf.employee);

  // Calculate PAYE
  // Excel Formula for Income Tax: =-(MIN(X,24000)*10%+...)
  // Excel Formula for PAYE: =Y+Z (Income Tax + Personal Relief)
  const paye = calculatePAYE(taxablePay, insurancePremium);

  // Calculate Net Payable (before other deductions)
  // Excel Formula: =X+AA (Taxable Pay + PAYE)
  const netPayable = taxablePay - paye.paye;

  // Calculate total other deductions (HELB, loans, etc.)
  const totalOtherDeductions = Object.values(otherDeductions).reduce(
    (sum, val) => sum + (val || 0),
    0
  );

  // Calculate Total Deductions
  const totalDeductions =
    nssf.employee +
    shifEmployee +
    ahl.employee +
    paye.paye +
    helb +
    totalOtherDeductions;

  // Calculate Final Net Pay
  // Excel Formula: =SUM(AB:AD) where AB=Net Payable, AC=HELB(-), AD=Loan(-)
  const netPay = netPayable - helb - totalOtherDeductions;

  // Calculate Employer Costs
  // Excel Formula: NITA=50, NSSF Employer=-W, AHL Employer=-V
  const nita = NITA.MONTHLY_PER_EMPLOYEE;

  // Excel Formula: =T+SUM(AG:AI) (Gross + NITA + NSSF Employer + AHL Employer)
  const costToCompany = grossPay + nssf.employer + ahl.employer + nita;

  return {
    // Earnings
    basic_salary: Math.round(basicSalary * 100) / 100,
    car_allowance: Math.round(carAllowance * 100) / 100,
    meal_allowance: Math.round(mealAllowance * 100) / 100,
    telephone_allowance: Math.round(telephoneAllowance * 100) / 100,
    housing_allowance: Math.round(housingAllowance * 100) / 100,
    other_earnings: otherAllowances,
    gross_pay: Math.round(grossPay * 100) / 100,

    // Statutory Deductions
    nssf_employee: nssf.employee,
    nssf_employer: nssf.employer,
    shif_employee: shifEmployee,
    ahl_employee: ahl.employee,
    ahl_employer: ahl.employer,

    // Tax
    taxable_pay: taxablePay,
    income_tax: paye.incomeTax,
    personal_relief: paye.personalRelief,
    insurance_relief: paye.insuranceRelief,
    paye: paye.paye,

    // Other
    helb: Math.round(helb * 100) / 100,
    other_deductions: otherDeductions,
    total_deductions: Math.round(totalDeductions * 100) / 100,

    // Net
    net_pay: Math.round(netPay * 100) / 100,

    // Employer
    nita,
    cost_to_company: Math.round(costToCompany * 100) / 100,
  };
}

/**
 * Calculate prorated salary for partial month
 */
export function calculateProratedSalary(
  monthlySalary: number,
  calendarDays: number,
  daysWorked: number
): number {
  if (calendarDays <= 0 || daysWorked <= 0) {
    return 0;
  }

  const dailyRate = monthlySalary / calendarDays;
  const proratedAmount = dailyRate * daysWorked;

  return Math.round(proratedAmount * 100) / 100;
}

/**
 * Format currency for Kenya (KES)
 */
export function formatKES(amount: number): string {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Parse currency string to number
 */
export function parseKES(value: string): number {
  // Remove currency symbol, commas, spaces, and parentheses
  const cleaned = value
    .replace(/[KES\s,()]/gi, '')
    .replace(/\(([^)]+)\)/, '-$1') // Convert (100) to -100
    .trim();

  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

/**
 * Validate payroll calculation matches expected values
 * Used for testing against CSV template
 */
export function validatePayrollCalculation(
  calculated: PayrollCalculation,
  expected: Partial<PayrollCalculation>,
  tolerance: number = 0.01
): { isValid: boolean; differences: string[] } {
  const differences: string[] = [];

  const checkField = (field: keyof PayrollCalculation, label: string) => {
    const calc = calculated[field];
    const exp = expected[field];

    if (exp !== undefined && typeof calc === 'number' && typeof exp === 'number') {
      if (Math.abs(calc - exp) > tolerance) {
        differences.push(
          `${label}: calculated ${calc.toFixed(2)}, expected ${exp.toFixed(2)}`
        );
      }
    }
  };

  checkField('gross_pay', 'Gross Pay');
  checkField('nssf_employee', 'NSSF Employee');
  checkField('shif_employee', 'SHIF');
  checkField('ahl_employee', 'AHL Employee');
  checkField('taxable_pay', 'Taxable Pay');
  checkField('income_tax', 'Income Tax');
  checkField('paye', 'PAYE');
  checkField('net_pay', 'Net Pay');
  checkField('cost_to_company', 'Cost to Company');

  return {
    isValid: differences.length === 0,
    differences,
  };
}
