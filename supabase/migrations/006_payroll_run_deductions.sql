-- Add payroll-run-specific employee deductions (one-off) managed by Finance
-- Supports HELB, loans, welfare, and custom deductions for a specific payroll run.

-- =====================================================
-- Payroll Employee Deductions (one-off per payroll run)
-- =====================================================

CREATE TABLE IF NOT EXISTS payroll_employee_deductions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_run_id UUID REFERENCES payroll_runs(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  deduction_type VARCHAR(50) NOT NULL,
  label TEXT,
  amount DECIMAL(12,2) NOT NULL CHECK (amount >= 0),
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payroll_employee_deductions_run ON payroll_employee_deductions(payroll_run_id);
CREATE INDEX IF NOT EXISTS idx_payroll_employee_deductions_employee ON payroll_employee_deductions(employee_id);
CREATE INDEX IF NOT EXISTS idx_payroll_employee_deductions_type ON payroll_employee_deductions(deduction_type);

-- Keep updated_at current
DROP TRIGGER IF EXISTS update_payroll_employee_deductions_updated_at ON payroll_employee_deductions;
CREATE TRIGGER update_payroll_employee_deductions_updated_at
BEFORE UPDATE ON payroll_employee_deductions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE payroll_employee_deductions ENABLE ROW LEVEL SECURITY;

-- Policies:
-- - Finance/Admin can manage deductions for employees in their company
-- - Any company user can view deductions in their company (optional, helps previews for HR/approval)

DROP POLICY IF EXISTS "Users can view company payroll deductions" ON payroll_employee_deductions;
CREATE POLICY "Users can view company payroll deductions" ON payroll_employee_deductions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM users u
      JOIN employees e ON e.company_id = u.company_id
      WHERE u.id = auth.uid()
        AND e.id = payroll_employee_deductions.employee_id
    )
  );

DROP POLICY IF EXISTS "Finance can manage payroll deductions" ON payroll_employee_deductions;
CREATE POLICY "Finance can manage payroll deductions" ON payroll_employee_deductions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM users u
      JOIN employees e ON e.company_id = u.company_id
      WHERE u.id = auth.uid()
        AND e.id = payroll_employee_deductions.employee_id
        AND u.role IN ('admin', 'finance')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM users u
      JOIN employees e ON e.company_id = u.company_id
      WHERE u.id = auth.uid()
        AND e.id = payroll_employee_deductions.employee_id
        AND u.role IN ('admin', 'finance')
    )
  );

-- Done
SELECT '006 payroll run deductions migration completed' as status;
