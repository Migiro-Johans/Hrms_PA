-- Disable RLS on payroll_employee_deductions table
-- This table needs to be accessible by admin, HR, and finance roles
-- Since we disabled RLS on users and employees tables (migration 010),
-- we need to also disable it here to allow proper access to deductions data

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view own deductions" ON payroll_employee_deductions;
DROP POLICY IF EXISTS "Admins can manage deductions" ON payroll_employee_deductions;
DROP POLICY IF EXISTS "HR can manage deductions" ON payroll_employee_deductions;
DROP POLICY IF EXISTS "Finance can manage deductions" ON payroll_employee_deductions;
DROP POLICY IF EXISTS "Enable read access for all users" ON payroll_employee_deductions;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON payroll_employee_deductions;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON payroll_employee_deductions;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON payroll_employee_deductions;

-- Disable RLS on payroll_employee_deductions table
ALTER TABLE payroll_employee_deductions DISABLE ROW LEVEL SECURITY;

-- Also disable RLS on payroll_runs table to ensure payroll processing works
ALTER TABLE payroll_runs DISABLE ROW LEVEL SECURITY;

SELECT '011 Payroll deductions and runs RLS disabled - HR and finance can now manage deductions' as status;
