// Kenya Payroll Constants (2024/2025)

// PAYE Tax Bands (Monthly)
export const PAYE_TAX_BANDS = [
  { min: 0, max: 24000, rate: 0.10 },
  { min: 24001, max: 32333, rate: 0.25 },
  { min: 32334, max: 500000, rate: 0.30 },
  { min: 500001, max: 800000, rate: 0.325 },
  { min: 800001, max: Infinity, rate: 0.35 },
] as const;

// NSSF Rates (New NSSF Act)
export const NSSF = {
  TIER_I_LIMIT: 7000, // KES 7,000
  TIER_II_UPPER_LIMIT: 36000, // KES 36,000
  RATE: 0.06, // 6%
  MAX_EMPLOYEE_CONTRIBUTION: 2160, // Max employee contribution per month
  MAX_EMPLOYER_CONTRIBUTION: 2160, // Max employer contribution per month
} as const;

// SHA/SHIF (Social Health Insurance Fund) - Replacing NHIF
export const SHIF = {
  RATE: 0.0275, // 2.75% of gross salary
} as const;

// Affordable Housing Levy
export const AHL = {
  EMPLOYEE_RATE: 0.015, // 1.5% of gross salary
  EMPLOYER_RATE: 0.015, // 1.5% of gross salary
} as const;

// Personal Relief
export const PERSONAL_RELIEF = {
  MONTHLY: 2400, // KES 2,400 per month
  ANNUAL: 28800, // KES 28,800 per year
} as const;

// Insurance Relief
export const INSURANCE_RELIEF = {
  RATE: 0.15, // 15% of premiums paid
  MAX_MONTHLY: 5000, // KES 5,000 per month
  MAX_ANNUAL: 60000, // KES 60,000 per year
} as const;

// NITA (National Industrial Training Authority) - Employer only
export const NITA = {
  MONTHLY_PER_EMPLOYEE: 50, // KES 50 per employee per month
} as const;

// Retirement Contribution Limits (for P9)
export const RETIREMENT = {
  MAX_MONTHLY: 20000, // KES 20,000 per month
  MAX_ANNUAL: 240000, // KES 240,000 per year
} as const;

// Owner Occupied Interest (for P9)
export const OWNER_OCCUPIED_INTEREST = {
  MAX_MONTHLY: 25000, // KES 25,000 per month
  MAX_ANNUAL: 300000, // KES 300,000 per year
} as const;

// Months
export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
] as const;

// Pay Groups
export const PAY_GROUPS = [
  'CEO',
  'Sr. Manager',
  'Manager',
  'Executive',
  'Specialist',
  'Associate',
  'Intern',
] as const;

// Employee Status
export const EMPLOYEE_STATUS = [
  'active',
  'terminated',
  'suspended',
  'on_leave',
] as const;

// Payroll Run Status
export const PAYROLL_STATUS = [
  'draft',
  'processing',
  'approved',
  'paid',
] as const;

// User Roles
export const USER_ROLES = [
  'admin',
  'hr',
  'accountant',
  'employee',
] as const;

// Deduction Types
export const DEDUCTION_TYPES = [
  'HELB',
  'Loan',
  'Sacco',
  'Advance',
  'Other',
] as const;
