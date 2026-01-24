/**
 * Kenyan Payroll Excel Template Formulas
 *
 * This module defines the Excel formulas used in the payroll spreadsheet template
 * following Kenyan statutory requirements (SHIF, AHL, NSSF, PAYE).
 *
 * Column Layout:
 * P: Basic Salary
 * Q: Car Allowance
 * R: Meal Allowance
 * S: Telephone Allowance
 * N: Calendar Days in Month
 * O: Number of Days Worked
 * T: Gross Payable
 * U: SHIF (2.75% of Gross)
 * V: AHL - Employee (1.5% of Gross)
 * W: NSSF - Employee (6% with KES 72,000 upper limit)
 * X: Taxable Pay
 * Y: Income Tax (Kenya PAYE Bands)
 * Z: Personal Relief
 * AA: PAYE
 * AB: Net Payable
 * AC: Other Deductions - HELB (Manual entry)
 * AD: Other Deductions - MAL Loan (Manual entry)
 * AE: Final Net Pay
 * AG: NITA Employer
 * AH: NSSF Employer
 * AI: AHL Employer
 * AJ: Cost to Company
 */

// =====================================================
// EXCEL FORMULA DEFINITIONS
// =====================================================

export const PAYROLL_FORMULAS = {
  /**
   * Column T: GROSS PAYABLE
   * Prorates salary based on days worked
   * =SUM(P2:S2)/N2*O2
   */
  GROSS_PAYABLE: (row: number) => `=SUM(P${row}:S${row})/N${row}*O${row}`,

  /**
   * Column U: SHIF (Social Health Insurance Fund)
   * 2.75% of Gross Pay (stored as negative)
   * =-T2*0.0275
   */
  SHIF: (row: number) => `=-T${row}*0.0275`,

  /**
   * Column V: AHL - Employee (Affordable Housing Levy)
   * 1.5% of Gross Pay (stored as negative)
   * =-T2*0.015
   */
  AHL_EMPLOYEE: (row: number) => `=-T${row}*0.015`,

  /**
   * Column W: NSSF - Employee
   * 6% with tiered structure:
   * - First KES 8,000: 6% (max KES 480)
   * - KES 8,000 to KES 72,000: 6% (max KES 3,840)
   * - Upper earnings limit: KES 72,000
   * - Maximum contribution: KES 4,320 (employee + employer each)
   * Stored as negative value
   * =-IF(T2<=8000, T2*0.06, IF(T2<=72000, 480+(T2-8000)*0.06, 480+(72000-8000)*0.06))
   */
  NSSF_EMPLOYEE: (row: number) =>
    `=-IF(T${row}<=8000,T${row}*0.06,IF(T${row}<=72000,480+(T${row}-8000)*0.06,480+(72000-8000)*0.06))`,

  /**
   * Column X: TAXABLE PAY
   * Gross pay minus statutory deductions (SHIF, AHL, NSSF)
   * =SUM(T2:W2)
   */
  TAXABLE_PAY: (row: number) => `=SUM(T${row}:W${row})`,

  /**
   * Column Y: INCOME TAX (Kenya PAYE Bands 2024)
   * Progressive tax bands:
   * - KES 0 - 24,000: 10%
   * - KES 24,001 - 32,333: 25%
   * - KES 32,334 - 500,000: 30%
   * - KES 500,001 - 800,000: 32.5%
   * - Above KES 800,000: 35%
   * Stored as negative value
   * =-(MIN(X2,24000)*10%+IF(X2>24000,MIN(X2-24000,8333)*25%,0)+IF(X2>32333,MIN(X2-32333,467667)*30%,0)+IF(X2>500000,MIN(X2-500000,300000)*32.5%,0)+IF(X2>800000,(X2-800000)*35%,0))
   */
  INCOME_TAX: (row: number) =>
    `=-(MIN(X${row},24000)*10%+IF(X${row}>24000,MIN(X${row}-24000,8333)*25%,0)+IF(X${row}>32333,MIN(X${row}-32333,467667)*30%,0)+IF(X${row}>500000,MIN(X${row}-500000,300000)*32.5%,0)+IF(X${row}>800000,(X${row}-800000)*35%,0))`,

  /**
   * Column Z: PERSONAL RELIEF
   * Fixed at KES 2,400 per month
   * =2400
   */
  PERSONAL_RELIEF: () => `=2400`,

  /**
   * Column AA: PAYE (Pay As You Earn)
   * Income Tax + Personal Relief (relief reduces tax)
   * =Y2+Z2
   */
  PAYE: (row: number) => `=Y${row}+Z${row}`,

  /**
   * Column AB: NET PAYABLE
   * Taxable Pay + PAYE
   * =X2+AA2
   */
  NET_PAYABLE: (row: number) => `=X${row}+AA${row}`,

  /**
   * Column AC: OTHER DEDUCTIONS - HELB
   * Manual entry (negative value)
   * No formula - user enters value
   */
  HELB: () => null,

  /**
   * Column AD: OTHER DEDUCTIONS - MAL LOAN
   * Manual entry (negative value)
   * No formula - user enters value
   */
  MAL_LOAN: () => null,

  /**
   * Column AE: FINAL NET PAY
   * Net Payable + Other Deductions (HELB, MAL Loan)
   * =SUM(AB2:AD2)
   */
  FINAL_NET_PAY: (row: number) => `=SUM(AB${row}:AD${row})`,

  /**
   * Column AG: NITA EMPLOYER
   * Fixed at KES 50 per employee per month
   * =50
   */
  NITA_EMPLOYER: () => `=50`,

  /**
   * Column AH: NSSF EMPLOYER
   * Matches employee contribution (negates the negative to get positive)
   * =-W2
   */
  NSSF_EMPLOYER: (row: number) => `=-W${row}`,

  /**
   * Column AI: AHL EMPLOYER
   * Matches employee contribution (negates the negative to get positive)
   * =-V2
   */
  AHL_EMPLOYER: (row: number) => `=-V${row}`,

  /**
   * Column AJ: COST TO COMPANY
   * Gross Pay + Employer Contributions (NITA, NSSF, AHL)
   * =T2+SUM(AG2:AI2)
   */
  COST_TO_COMPANY: (row: number) => `=T${row}+SUM(AG${row}:AI${row})`,
} as const;

// =====================================================
// COLUMN MAPPING
// =====================================================

export const PAYROLL_COLUMNS = {
  // Input columns
  CALENDAR_DAYS: 'N',
  DAYS_WORKED: 'O',
  BASIC_SALARY: 'P',
  CAR_ALLOWANCE: 'Q',
  MEAL_ALLOWANCE: 'R',
  TELEPHONE_ALLOWANCE: 'S',

  // Formula columns
  GROSS_PAYABLE: 'T',
  SHIF: 'U',
  AHL_EMPLOYEE: 'V',
  NSSF_EMPLOYEE: 'W',
  TAXABLE_PAY: 'X',
  INCOME_TAX: 'Y',
  PERSONAL_RELIEF: 'Z',
  PAYE: 'AA',
  NET_PAYABLE: 'AB',
  HELB: 'AC',
  MAL_LOAN: 'AD',
  FINAL_NET_PAY: 'AE',

  // Employer contributions (Column AF is intentionally skipped as separator)
  NITA_EMPLOYER: 'AG',
  NSSF_EMPLOYER: 'AH',
  AHL_EMPLOYER: 'AI',
  COST_TO_COMPANY: 'AJ',
} as const;

// =====================================================
// COLUMN HEADERS
// =====================================================

export const PAYROLL_HEADERS = {
  N: 'Calendar Days',
  O: 'Days Worked',
  P: 'Basic Salary',
  Q: 'Car Allowance',
  R: 'Meal Allowance',
  S: 'Telephone Allowance',
  T: 'Gross Payable',
  U: 'SHIF (2.75%)',
  V: 'AHL Employee (1.5%)',
  W: 'NSSF Employee',
  X: 'Taxable Pay',
  Y: 'Income Tax',
  Z: 'Personal Relief',
  AA: 'PAYE',
  AB: 'Net Payable',
  AC: 'HELB',
  AD: 'MAL Loan',
  AE: 'Final Net Pay',
  AG: 'NITA Employer',
  AH: 'NSSF Employer',
  AI: 'AHL Employer',
  AJ: 'Cost to Company',
} as const;

// =====================================================
// STATUTORY RATES (2024)
// =====================================================

export const STATUTORY_RATES = {
  SHIF: {
    rate: 0.0275, // 2.75% of gross salary
  },
  AHL: {
    employeeRate: 0.015, // 1.5% of gross salary
    employerRate: 0.015, // 1.5% of gross salary
  },
  NSSF: {
    rate: 0.06, // 6%
    tierILimit: 8000, // First tier limit
    upperEarningsLimit: 72000, // Upper earnings limit
    maxContribution: 4320, // Max employee contribution per month
  },
  PAYE: {
    bands: [
      { min: 0, max: 24000, rate: 0.10 },
      { min: 24001, max: 32333, rate: 0.25 },
      { min: 32334, max: 500000, rate: 0.30 },
      { min: 500001, max: 800000, rate: 0.325 },
      { min: 800001, max: Infinity, rate: 0.35 },
    ],
    personalRelief: 2400, // KES 2,400 per month
  },
  NITA: {
    perEmployee: 50, // KES 50 per employee per month
  },
} as const;

// =====================================================
// FORMULA GENERATOR UTILITIES
// =====================================================

/**
 * Generate all formulas for a specific row
 */
export function generateRowFormulas(row: number): Record<string, string | null> {
  return {
    T: PAYROLL_FORMULAS.GROSS_PAYABLE(row),
    U: PAYROLL_FORMULAS.SHIF(row),
    V: PAYROLL_FORMULAS.AHL_EMPLOYEE(row),
    W: PAYROLL_FORMULAS.NSSF_EMPLOYEE(row),
    X: PAYROLL_FORMULAS.TAXABLE_PAY(row),
    Y: PAYROLL_FORMULAS.INCOME_TAX(row),
    Z: PAYROLL_FORMULAS.PERSONAL_RELIEF(),
    AA: PAYROLL_FORMULAS.PAYE(row),
    AB: PAYROLL_FORMULAS.NET_PAYABLE(row),
    AC: PAYROLL_FORMULAS.HELB(),
    AD: PAYROLL_FORMULAS.MAL_LOAN(),
    AE: PAYROLL_FORMULAS.FINAL_NET_PAY(row),
    AG: PAYROLL_FORMULAS.NITA_EMPLOYER(),
    AH: PAYROLL_FORMULAS.NSSF_EMPLOYER(row),
    AI: PAYROLL_FORMULAS.AHL_EMPLOYER(row),
    AJ: PAYROLL_FORMULAS.COST_TO_COMPANY(row),
  };
}

/**
 * Generate formulas for a range of rows
 */
export function generateFormulasForRange(
  startRow: number,
  endRow: number
): Array<{ row: number; formulas: Record<string, string | null> }> {
  const result = [];
  for (let row = startRow; row <= endRow; row++) {
    result.push({
      row,
      formulas: generateRowFormulas(row),
    });
  }
  return result;
}

/**
 * Get formula documentation for a column
 */
export function getFormulaDocumentation(column: keyof typeof PAYROLL_HEADERS): string {
  const docs: Record<string, string> = {
    T: 'Prorates total allowances by days worked: (P+Q+R+S)/N*O',
    U: 'SHIF at 2.75% of gross (negative): -T*0.0275',
    V: 'AHL Employee at 1.5% of gross (negative): -T*0.015',
    W: 'NSSF with tiered structure up to KES 72,000 limit (negative)',
    X: 'Taxable Pay = Gross + Deductions (since deductions are negative)',
    Y: 'Progressive tax using Kenya PAYE bands (negative)',
    Z: 'Personal Relief fixed at KES 2,400',
    AA: 'PAYE = Income Tax + Personal Relief',
    AB: 'Net Payable = Taxable Pay + PAYE',
    AC: 'HELB deduction (manual entry, negative value)',
    AD: 'MAL Loan deduction (manual entry, negative value)',
    AE: 'Final Net Pay = Net Payable + Other Deductions',
    AG: 'NITA Employer fixed at KES 50',
    AH: 'NSSF Employer matches employee contribution',
    AI: 'AHL Employer matches employee contribution',
    AJ: 'Cost to Company = Gross + Employer Contributions',
  };
  return docs[column] || 'No documentation available';
}

// =====================================================
// VALIDATION NOTES
// =====================================================

/**
 * Important notes for payroll template usage:
 *
 * 1. All deductions (SHIF, AHL, NSSF, PAYE) are stored as NEGATIVE values
 *    This allows for simple SUM formulas to calculate net pay
 *
 * 2. NSSF uses 2024 rates with upper earnings limit of KES 72,000
 *    - First KES 8,000: 6% = KES 480 max
 *    - KES 8,000 to KES 72,000: 6% = KES 3,840 max
 *    - Maximum contribution: KES 4,320 each (employee + employer)
 *
 * 3. Personal Relief is KES 2,400 per month (KES 28,800 annually)
 *
 * 4. NITA is fixed at KES 50 per employee per month
 *
 * 5. HELB and MAL Loan are manual entry fields (no formulas)
 *    Values should be entered as negative numbers
 *
 * 6. Apply formulas from Row 2 downwards for all employees
 *    Row 1 is reserved for headers
 */
