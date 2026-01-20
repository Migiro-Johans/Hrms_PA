// Database Types for Kenya Payroll System

export interface Company {
  id: string;
  name: string;
  kra_pin?: string;
  nssf_number?: string;
  nhif_number?: string;
  address?: string;
  email?: string;
  phone?: string;
  logo_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Department {
  id: string;
  company_id: string;
  name: string;
  created_at: string;
}

export interface PayGrade {
  id: string;
  company_id: string;
  pay_group: string;
  pay_grade: string;
  basic_salary?: number;
  created_at: string;
}

export interface Employee {
  id: string;
  company_id: string;
  department_id?: string;
  pay_grade_id?: string;
  staff_id: string;
  first_name: string;
  last_name: string;
  middle_name?: string;
  gender?: string;
  email?: string;
  phone?: string;
  employment_date: string;
  termination_date?: string;
  job_role?: string;
  kra_pin?: string;
  nssf_number?: string;
  nhif_number?: string;
  bank_name?: string;
  bank_branch?: string;
  account_number?: string;
  status: 'active' | 'terminated' | 'suspended' | 'on_leave';
  created_at: string;
  updated_at: string;
  // Joined data
  department?: Department;
  pay_grade?: PayGrade;
  salary_structure?: SalaryStructure;
}

export interface SalaryStructure {
  id: string;
  employee_id: string;
  basic_salary: number;
  car_allowance: number;
  meal_allowance: number;
  telephone_allowance: number;
  housing_allowance: number;
  other_allowances: Record<string, number>;
  effective_date: string;
  created_at: string;
}

export interface RecurringDeduction {
  id: string;
  employee_id: string;
  deduction_type: string;
  amount: number;
  start_date: string;
  end_date?: string;
  is_active: boolean;
  created_at: string;
}

export interface PayrollRun {
  id: string;
  company_id: string;
  month: number;
  year: number;
  status: 'draft' | 'processing' | 'approved' | 'paid';
  processed_by?: string;
  approved_by?: string;
  processed_at?: string;
  approved_at?: string;
  created_at: string;
  // Computed
  payslips?: Payslip[];
  total_gross?: number;
  total_net?: number;
  total_paye?: number;
  employee_count?: number;
}

export interface Payslip {
  id: string;
  payroll_run_id: string;
  employee_id: string;

  // Earnings
  basic_salary: number;
  car_allowance: number;
  meal_allowance: number;
  telephone_allowance: number;
  housing_allowance: number;
  other_earnings: Record<string, number>;
  gross_pay: number;

  // Days
  calendar_days?: number;
  days_worked?: number;

  // Statutory Deductions
  nssf_employee: number;
  nssf_employer: number;
  shif_employee: number;
  ahl_employee: number;
  ahl_employer: number;

  // Tax Calculation
  taxable_pay: number;
  income_tax: number;
  personal_relief: number;
  insurance_relief: number;
  paye: number;

  // Other Deductions
  helb: number;
  other_deductions: Record<string, number>;
  total_deductions: number;

  // Net
  net_pay: number;

  // Employer Costs
  nita: number;
  cost_to_company: number;

  created_at: string;

  // Joined data
  employee?: Employee;
  payroll_run?: PayrollRun;
}

export interface P9Record {
  id: string;
  employee_id: string;
  year: number;
  month: number;
  basic_salary: number;
  benefits_noncash: number;
  value_of_quarters: number;
  total_gross_pay: number;
  defined_contribution_30_percent: number;
  defined_contribution_actual: number;
  defined_contribution_fixed: number;
  owner_occupied_interest: number;
  retirement_contribution_total: number;
  chargeable_pay: number;
  tax_charged: number;
  personal_relief: number;
  insurance_relief: number;
  paye_tax: number;
  created_at: string;
}

export interface User {
  id: string;
  email: string;
  company_id?: string;
  role: 'admin' | 'hr' | 'accountant' | 'employee';
  employee_id?: string;
  created_at: string;
}

// Input types for calculations
export interface PayrollInput {
  basic_salary: number;
  car_allowance?: number;
  meal_allowance?: number;
  telephone_allowance?: number;
  housing_allowance?: number;
  other_allowances?: Record<string, number>;
  other_deductions?: Record<string, number>;
  helb?: number;
  insurance_premium?: number;
  calendar_days?: number;
  days_worked?: number;
}

export interface PayrollCalculation {
  // Earnings
  basic_salary: number;
  car_allowance: number;
  meal_allowance: number;
  telephone_allowance: number;
  housing_allowance: number;
  other_earnings: Record<string, number>;
  gross_pay: number;

  // Statutory Deductions
  nssf_employee: number;
  nssf_employer: number;
  shif_employee: number;
  ahl_employee: number;
  ahl_employer: number;

  // Tax
  taxable_pay: number;
  income_tax: number;
  personal_relief: number;
  insurance_relief: number;
  paye: number;

  // Other
  helb: number;
  other_deductions: Record<string, number>;
  total_deductions: number;

  // Net
  net_pay: number;

  // Employer
  nita: number;
  cost_to_company: number;
}

// CSV Import Types
export interface EmployeeCSVRow {
  'Staff ID': string;
  'First Name': string;
  'Last Name': string;
  'Middle Name'?: string;
  'Gender'?: string;
  'Employment Date': string;
  'Pay Group'?: string;
  'Pay Grade'?: string;
  'Department'?: string;
  'Job Role'?: string;
  'NSSF Number'?: string;
  'NHIF Number'?: string;
  'KRA PIN'?: string;
  'Bank Name'?: string;
  'Account Number'?: string;
  'Basic Salary'?: string;
  'Car Allowance'?: string;
  'Meal Allowance'?: string;
  'Telephone Allowance'?: string;
}

// API Response Types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}
