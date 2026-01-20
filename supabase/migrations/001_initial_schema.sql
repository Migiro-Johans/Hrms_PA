-- Kenya Payroll System Database Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Companies/Organizations
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  kra_pin VARCHAR(20),
  nssf_number VARCHAR(20),
  nhif_number VARCHAR(20),
  address TEXT,
  email VARCHAR(255),
  phone VARCHAR(20),
  logo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Departments
CREATE TABLE IF NOT EXISTS departments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pay Groups & Grades
CREATE TABLE IF NOT EXISTS pay_grades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  pay_group VARCHAR(50) NOT NULL,
  pay_grade VARCHAR(20) NOT NULL,
  basic_salary DECIMAL(12,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Employees
CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  pay_grade_id UUID REFERENCES pay_grades(id) ON DELETE SET NULL,
  staff_id VARCHAR(20) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  middle_name VARCHAR(100),
  gender VARCHAR(10),
  email VARCHAR(255),
  phone VARCHAR(20),
  employment_date DATE NOT NULL,
  termination_date DATE,
  job_role VARCHAR(255),
  kra_pin VARCHAR(20),
  nssf_number VARCHAR(20),
  nhif_number VARCHAR(20),
  bank_name VARCHAR(255),
  bank_branch VARCHAR(255),
  account_number VARCHAR(50),
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, staff_id)
);

-- Salary Structure (per employee)
CREATE TABLE IF NOT EXISTS salary_structures (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  basic_salary DECIMAL(12,2) NOT NULL,
  car_allowance DECIMAL(12,2) DEFAULT 0,
  meal_allowance DECIMAL(12,2) DEFAULT 0,
  telephone_allowance DECIMAL(12,2) DEFAULT 0,
  housing_allowance DECIMAL(12,2) DEFAULT 0,
  other_allowances JSONB DEFAULT '{}',
  effective_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Recurring Deductions (HELB, Loans, etc.)
CREATE TABLE IF NOT EXISTS recurring_deductions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  deduction_type VARCHAR(50) NOT NULL,
  description TEXT,
  amount DECIMAL(12,2) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payroll Runs
CREATE TABLE IF NOT EXISTS payroll_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL CHECK (year >= 2020),
  status VARCHAR(20) DEFAULT 'draft',
  processed_by UUID,
  approved_by UUID,
  processed_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, month, year)
);

-- Payslips (individual employee payroll records)
CREATE TABLE IF NOT EXISTS payslips (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payroll_run_id UUID REFERENCES payroll_runs(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,

  -- Earnings
  basic_salary DECIMAL(12,2) NOT NULL,
  car_allowance DECIMAL(12,2) DEFAULT 0,
  meal_allowance DECIMAL(12,2) DEFAULT 0,
  telephone_allowance DECIMAL(12,2) DEFAULT 0,
  housing_allowance DECIMAL(12,2) DEFAULT 0,
  other_earnings JSONB DEFAULT '{}',
  gross_pay DECIMAL(12,2) NOT NULL,

  -- Days
  calendar_days INTEGER,
  days_worked INTEGER,

  -- Statutory Deductions
  nssf_employee DECIMAL(12,2) DEFAULT 0,
  nssf_employer DECIMAL(12,2) DEFAULT 0,
  shif_employee DECIMAL(12,2) DEFAULT 0,
  ahl_employee DECIMAL(12,2) DEFAULT 0,
  ahl_employer DECIMAL(12,2) DEFAULT 0,

  -- Tax Calculation
  taxable_pay DECIMAL(12,2) NOT NULL,
  income_tax DECIMAL(12,2) NOT NULL,
  personal_relief DECIMAL(12,2) DEFAULT 2400,
  insurance_relief DECIMAL(12,2) DEFAULT 0,
  paye DECIMAL(12,2) NOT NULL,

  -- Other Deductions
  helb DECIMAL(12,2) DEFAULT 0,
  other_deductions JSONB DEFAULT '{}',
  total_deductions DECIMAL(12,2) NOT NULL,

  -- Net
  net_pay DECIMAL(12,2) NOT NULL,

  -- Employer Costs
  nita DECIMAL(12,2) DEFAULT 50,
  cost_to_company DECIMAL(12,2) NOT NULL,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(payroll_run_id, employee_id)
);

-- P9 Tax Records (for annual tax deduction card)
CREATE TABLE IF NOT EXISTS p9_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  basic_salary DECIMAL(12,2) DEFAULT 0,
  benefits_noncash DECIMAL(12,2) DEFAULT 0,
  value_of_quarters DECIMAL(12,2) DEFAULT 0,
  total_gross_pay DECIMAL(12,2) DEFAULT 0,
  defined_contribution_30_percent DECIMAL(12,2) DEFAULT 0,
  defined_contribution_actual DECIMAL(12,2) DEFAULT 0,
  defined_contribution_fixed DECIMAL(12,2) DEFAULT 0,
  owner_occupied_interest DECIMAL(12,2) DEFAULT 0,
  retirement_contribution_total DECIMAL(12,2) DEFAULT 0,
  chargeable_pay DECIMAL(12,2) DEFAULT 0,
  tax_charged DECIMAL(12,2) DEFAULT 0,
  personal_relief DECIMAL(12,2) DEFAULT 2400,
  insurance_relief DECIMAL(12,2) DEFAULT 0,
  paye_tax DECIMAL(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(employee_id, year, month)
);

-- Users (linked to Supabase Auth)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  role VARCHAR(20) DEFAULT 'employee',
  employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_employees_company ON employees(company_id);
CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status);
CREATE INDEX IF NOT EXISTS idx_payslips_payroll_run ON payslips(payroll_run_id);
CREATE INDEX IF NOT EXISTS idx_payslips_employee ON payslips(employee_id);
CREATE INDEX IF NOT EXISTS idx_payroll_runs_company ON payroll_runs(company_id);
CREATE INDEX IF NOT EXISTS idx_payroll_runs_period ON payroll_runs(year, month);
CREATE INDEX IF NOT EXISTS idx_p9_records_employee ON p9_records(employee_id);
CREATE INDEX IF NOT EXISTS idx_p9_records_year ON p9_records(year);
CREATE INDEX IF NOT EXISTS idx_salary_structures_employee ON salary_structures(employee_id);
CREATE INDEX IF NOT EXISTS idx_recurring_deductions_employee ON recurring_deductions(employee_id);

-- Row Level Security Policies
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE pay_grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE salary_structures ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_deductions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE payslips ENABLE ROW LEVEL SECURITY;
ALTER TABLE p9_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their company's data
CREATE POLICY "Users can view own company" ON companies
  FOR SELECT USING (
    id IN (SELECT company_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Users can view own company departments" ON departments
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Users can view own company employees" ON employees
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Users can view own company pay grades" ON pay_grades
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Users can view own company payroll runs" ON payroll_runs
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
  );

-- Employees can only see their own payslips
CREATE POLICY "Employees can view own payslips" ON payslips
  FOR SELECT USING (
    employee_id IN (SELECT employee_id FROM users WHERE id = auth.uid())
    OR
    EXISTS (
      SELECT 1 FROM users u
      JOIN payroll_runs pr ON pr.company_id = u.company_id
      WHERE u.id = auth.uid()
      AND pr.id = payslips.payroll_run_id
      AND u.role IN ('admin', 'hr', 'accountant')
    )
  );

-- Employees can only see their own P9 records
CREATE POLICY "Employees can view own P9 records" ON p9_records
  FOR SELECT USING (
    employee_id IN (SELECT employee_id FROM users WHERE id = auth.uid())
    OR
    EXISTS (
      SELECT 1 FROM users u
      JOIN employees e ON e.company_id = u.company_id
      WHERE u.id = auth.uid()
      AND e.id = p9_records.employee_id
      AND u.role IN ('admin', 'hr', 'accountant')
    )
  );

-- Admin/HR can manage employees
CREATE POLICY "Admin/HR can manage employees" ON employees
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.company_id = employees.company_id
      AND u.role IN ('admin', 'hr')
    )
  );

-- Admin/Accountant can manage payroll
CREATE POLICY "Admin/Accountant can manage payroll" ON payroll_runs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.company_id = payroll_runs.company_id
      AND u.role IN ('admin', 'accountant')
    )
  );

CREATE POLICY "Admin/Accountant can manage payslips" ON payslips
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN payroll_runs pr ON pr.company_id = u.company_id
      WHERE u.id = auth.uid()
      AND pr.id = payslips.payroll_run_id
      AND u.role IN ('admin', 'accountant')
    )
  );

-- Users can view own profile
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (id = auth.uid());

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_employees_updated_at
  BEFORE UPDATE ON employees
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to create P9 record from payslip
CREATE OR REPLACE FUNCTION create_p9_from_payslip()
RETURNS TRIGGER AS $$
DECLARE
  v_year INTEGER;
  v_month INTEGER;
BEGIN
  -- Get year and month from payroll run
  SELECT year, month INTO v_year, v_month
  FROM payroll_runs WHERE id = NEW.payroll_run_id;

  -- Insert or update P9 record
  INSERT INTO p9_records (
    employee_id, year, month,
    basic_salary, total_gross_pay,
    defined_contribution_actual,
    chargeable_pay, tax_charged,
    personal_relief, insurance_relief, paye_tax
  ) VALUES (
    NEW.employee_id, v_year, v_month,
    NEW.basic_salary, NEW.gross_pay,
    NEW.nssf_employee,
    NEW.taxable_pay, NEW.income_tax,
    NEW.personal_relief, NEW.insurance_relief, NEW.paye
  )
  ON CONFLICT (employee_id, year, month)
  DO UPDATE SET
    basic_salary = EXCLUDED.basic_salary,
    total_gross_pay = EXCLUDED.total_gross_pay,
    defined_contribution_actual = EXCLUDED.defined_contribution_actual,
    chargeable_pay = EXCLUDED.chargeable_pay,
    tax_charged = EXCLUDED.tax_charged,
    personal_relief = EXCLUDED.personal_relief,
    insurance_relief = EXCLUDED.insurance_relief,
    paye_tax = EXCLUDED.paye_tax;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-create P9 records
CREATE TRIGGER create_p9_on_payslip_insert
  AFTER INSERT OR UPDATE ON payslips
  FOR EACH ROW EXECUTE FUNCTION create_p9_from_payslip();
