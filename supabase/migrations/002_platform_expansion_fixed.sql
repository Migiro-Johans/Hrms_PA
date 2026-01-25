-- Kenya Payroll System - Platform Expansion Migration (Fixed)
-- Adds: Audit logging, Approval workflows, Leave management, Per diem, Tasks, Performance reviews, Promotions

-- =====================================================
-- PART 0: DROP ALL POLICIES THAT REFERENCE users.role
-- =====================================================

-- Users table policies
DROP POLICY IF EXISTS "Admins can manage company users" ON users;
DROP POLICY IF EXISTS "Admins can update company users" ON users;
DROP POLICY IF EXISTS "Admins can view company users" ON users;
DROP POLICY IF EXISTS "Users can insert own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Admins can manage users" ON users;

-- Employees table policies
DROP POLICY IF EXISTS "Admin/HR can manage employees" ON employees;
DROP POLICY IF EXISTS "Admin can manage employees" ON employees;
DROP POLICY IF EXISTS "HR can manage employees" ON employees;
DROP POLICY IF EXISTS "Users can view company employees" ON employees;
DROP POLICY IF EXISTS "Employees can view own record" ON employees;

-- Departments table policies
DROP POLICY IF EXISTS "Admin/HR can manage departments" ON departments;
DROP POLICY IF EXISTS "Users can view company departments" ON departments;

-- Companies table policies
DROP POLICY IF EXISTS "Admin can manage company" ON companies;
DROP POLICY IF EXISTS "Users can view own company" ON companies;

-- Pay grades policies
DROP POLICY IF EXISTS "Admin/HR can manage pay grades" ON pay_grades;
DROP POLICY IF EXISTS "Users can view company pay grades" ON pay_grades;

-- Payroll runs policies
DROP POLICY IF EXISTS "Admin/Accountant can manage payroll" ON payroll_runs;
DROP POLICY IF EXISTS "Finance can manage payroll" ON payroll_runs;
DROP POLICY IF EXISTS "Users can view company payroll" ON payroll_runs;

-- Payslips policies
DROP POLICY IF EXISTS "Admin/Accountant can manage payslips" ON payslips;
DROP POLICY IF EXISTS "Finance can manage payslips" ON payslips;
DROP POLICY IF EXISTS "Employees can view own payslips" ON payslips;

-- Salary structures policies
DROP POLICY IF EXISTS "Admin/HR can manage salary structures" ON salary_structures;
DROP POLICY IF EXISTS "Employees can view own salary" ON salary_structures;

-- Recurring deductions policies
DROP POLICY IF EXISTS "Admin/HR can manage deductions" ON recurring_deductions;
DROP POLICY IF EXISTS "Employees can view own deductions" ON recurring_deductions;

-- P9 records policies
DROP POLICY IF EXISTS "Employees can view own P9 records" ON p9_records;
DROP POLICY IF EXISTS "Employees can view own P9/G9 records" ON p9_records;
DROP POLICY IF EXISTS "Admin/HR can view P9 records" ON p9_records;

-- Drop policies on tables that may or may not exist (from previous partial migrations)
-- Using DO block with dynamic SQL to drop ALL policies on tables that exist
DO $$
DECLARE
  r RECORD;
BEGIN
  -- Drop ALL policies on tasks table dynamically
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tasks' AND table_schema = 'public') THEN
    FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'tasks' AND schemaname = 'public'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON tasks', r.policyname);
    END LOOP;
  END IF;

  -- Drop ALL policies on other tables that may exist dynamically
  -- This ensures we catch any policies regardless of their names

  -- Leave types
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'leave_types' AND table_schema = 'public') THEN
    FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'leave_types' AND schemaname = 'public'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON leave_types', r.policyname);
    END LOOP;
  END IF;

  -- Leave balances
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'leave_balances' AND table_schema = 'public') THEN
    FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'leave_balances' AND schemaname = 'public'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON leave_balances', r.policyname);
    END LOOP;
  END IF;

  -- Leave requests
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'leave_requests' AND table_schema = 'public') THEN
    FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'leave_requests' AND schemaname = 'public'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON leave_requests', r.policyname);
    END LOOP;
  END IF;

  -- Per diem rates
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'per_diem_rates' AND table_schema = 'public') THEN
    FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'per_diem_rates' AND schemaname = 'public'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON per_diem_rates', r.policyname);
    END LOOP;
  END IF;

  -- Per diem requests
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'per_diem_requests' AND table_schema = 'public') THEN
    FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'per_diem_requests' AND schemaname = 'public'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON per_diem_requests', r.policyname);
    END LOOP;
  END IF;

  -- Workflow definitions
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'workflow_definitions' AND table_schema = 'public') THEN
    FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'workflow_definitions' AND schemaname = 'public'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON workflow_definitions', r.policyname);
    END LOOP;
  END IF;

  -- Approval requests
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'approval_requests' AND table_schema = 'public') THEN
    FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'approval_requests' AND schemaname = 'public'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON approval_requests', r.policyname);
    END LOOP;
  END IF;

  -- Approval actions
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'approval_actions' AND table_schema = 'public') THEN
    FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'approval_actions' AND schemaname = 'public'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON approval_actions', r.policyname);
    END LOOP;
  END IF;

  -- Review cycles
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'review_cycles' AND table_schema = 'public') THEN
    FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'review_cycles' AND schemaname = 'public'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON review_cycles', r.policyname);
    END LOOP;
  END IF;

  -- Performance reviews
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'performance_reviews' AND table_schema = 'public') THEN
    FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'performance_reviews' AND schemaname = 'public'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON performance_reviews', r.policyname);
    END LOOP;
  END IF;

  -- Employee KPIs
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'employee_kpis' AND table_schema = 'public') THEN
    FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'employee_kpis' AND schemaname = 'public'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON employee_kpis', r.policyname);
    END LOOP;
  END IF;

  -- Promotion requests
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'promotion_requests' AND table_schema = 'public') THEN
    FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'promotion_requests' AND schemaname = 'public'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON promotion_requests', r.policyname);
    END LOOP;
  END IF;

  -- Task comments
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'task_comments' AND table_schema = 'public') THEN
    FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'task_comments' AND schemaname = 'public'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON task_comments', r.policyname);
    END LOOP;
  END IF;

  -- Department documents
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'department_documents' AND table_schema = 'public') THEN
    FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'department_documents' AND schemaname = 'public'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON department_documents', r.policyname);
    END LOOP;
  END IF;

  -- Audit logs
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_logs' AND table_schema = 'public') THEN
    FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'audit_logs' AND schemaname = 'public'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON audit_logs', r.policyname);
    END LOOP;
  END IF;

  -- Notification queue
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notification_queue' AND table_schema = 'public') THEN
    FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'notification_queue' AND schemaname = 'public'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON notification_queue', r.policyname);
    END LOOP;
  END IF;
END $$;

-- =====================================================
-- PART 0.1: ALTER THE ROLE COLUMN
-- =====================================================

ALTER TABLE users ALTER COLUMN role TYPE VARCHAR(30);

-- =====================================================
-- PART 0.2: RECREATE ALL DROPPED POLICIES
-- =====================================================

-- Users table policies
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Users can insert own profile" ON users
  FOR INSERT WITH CHECK (id = auth.uid());

CREATE POLICY "Admins can view company users" ON users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.company_id = users.company_id
      AND u.role IN ('admin', 'hr')
    )
  );

CREATE POLICY "Admins can update company users" ON users
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.company_id = users.company_id
      AND u.role = 'admin'
    )
  );

CREATE POLICY "Admins can manage company users" ON users
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.company_id = users.company_id
      AND u.role = 'admin'
    )
  );

-- Employees table policies
CREATE POLICY "Users can view company employees" ON employees
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Admin/HR can manage employees" ON employees
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.company_id = employees.company_id
      AND u.role IN ('admin', 'hr')
    )
  );

-- Departments table policies
CREATE POLICY "Users can view company departments" ON departments
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Admin/HR can manage departments" ON departments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.company_id = departments.company_id
      AND u.role IN ('admin', 'hr')
    )
  );

-- Companies table policies
CREATE POLICY "Users can view own company" ON companies
  FOR SELECT USING (
    id IN (SELECT company_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Admin can manage company" ON companies
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.company_id = companies.id
      AND u.role = 'admin'
    )
  );

-- Pay grades policies
CREATE POLICY "Users can view company pay grades" ON pay_grades
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Admin/HR can manage pay grades" ON pay_grades
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.company_id = pay_grades.company_id
      AND u.role IN ('admin', 'hr')
    )
  );

-- Payroll runs policies
CREATE POLICY "Users can view company payroll" ON payroll_runs
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Finance can manage payroll" ON payroll_runs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.company_id = payroll_runs.company_id
      AND u.role IN ('admin', 'finance', 'hr')
    )
  );

-- Payslips policies
CREATE POLICY "Employees can view own payslips" ON payslips
  FOR SELECT USING (
    employee_id IN (SELECT employee_id FROM users WHERE id = auth.uid())
    OR
    EXISTS (
      SELECT 1 FROM users u
      JOIN payroll_runs pr ON pr.company_id = u.company_id
      WHERE u.id = auth.uid()
      AND pr.id = payslips.payroll_run_id
      AND u.role IN ('admin', 'hr', 'finance', 'management')
    )
  );

CREATE POLICY "Finance can manage payslips" ON payslips
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN payroll_runs pr ON pr.company_id = u.company_id
      WHERE u.id = auth.uid()
      AND pr.id = payslips.payroll_run_id
      AND u.role IN ('admin', 'finance')
    )
  );

-- Salary structures policies
CREATE POLICY "Employees can view own salary" ON salary_structures
  FOR SELECT USING (
    employee_id IN (SELECT employee_id FROM users WHERE id = auth.uid())
    OR
    EXISTS (
      SELECT 1 FROM users u
      JOIN employees e ON e.company_id = u.company_id
      WHERE u.id = auth.uid()
      AND e.id = salary_structures.employee_id
      AND u.role IN ('admin', 'hr', 'finance')
    )
  );

CREATE POLICY "Admin/HR can manage salary structures" ON salary_structures
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN employees e ON e.company_id = u.company_id
      WHERE u.id = auth.uid()
      AND e.id = salary_structures.employee_id
      AND u.role IN ('admin', 'hr')
    )
  );

-- Recurring deductions policies
CREATE POLICY "Employees can view own deductions" ON recurring_deductions
  FOR SELECT USING (
    employee_id IN (SELECT employee_id FROM users WHERE id = auth.uid())
    OR
    EXISTS (
      SELECT 1 FROM users u
      JOIN employees e ON e.company_id = u.company_id
      WHERE u.id = auth.uid()
      AND e.id = recurring_deductions.employee_id
      AND u.role IN ('admin', 'hr', 'finance')
    )
  );

CREATE POLICY "Admin/HR can manage deductions" ON recurring_deductions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN employees e ON e.company_id = u.company_id
      WHERE u.id = auth.uid()
      AND e.id = recurring_deductions.employee_id
      AND u.role IN ('admin', 'hr')
    )
  );

-- P9 records policies
CREATE POLICY "Employees can view own P9/G9 records" ON p9_records
  FOR SELECT USING (
    employee_id IN (SELECT employee_id FROM users WHERE id = auth.uid())
    OR
    EXISTS (
      SELECT 1 FROM users u
      JOIN employees e ON e.company_id = u.company_id
      WHERE u.id = auth.uid()
      AND e.id = p9_records.employee_id
      AND u.role IN ('admin', 'hr', 'finance')
    )
  );

-- =====================================================
-- PART 1: MODIFY EXISTING TABLES
-- =====================================================

-- Add manager hierarchy to employees
ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS manager_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_line_manager BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_employees_manager ON employees(manager_id);

-- Add objectives/KPIs to departments
ALTER TABLE departments
  ADD COLUMN IF NOT EXISTS line_manager_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS objectives JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS kpis JSONB DEFAULT '[]';

-- Expand payroll_runs for multi-step approval workflow
ALTER TABLE payroll_runs
  ADD COLUMN IF NOT EXISTS hr_approved_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS hr_approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS management_approved_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS management_approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS notification_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejection_comments TEXT;

-- =====================================================
-- PART 2: AUDIT LOGGING SYSTEM
-- =====================================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action VARCHAR(50) NOT NULL,
  table_name VARCHAR(100) NOT NULL,
  record_id UUID NOT NULL,
  old_values JSONB,
  new_values JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  is_critical BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_company ON audit_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table ON audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_record ON audit_logs(record_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_critical ON audit_logs(is_critical) WHERE is_critical = true;
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin/HR can view audit logs" ON audit_logs;
CREATE POLICY "Admin/HR can view audit logs" ON audit_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.company_id = audit_logs.company_id
      AND u.role IN ('admin', 'hr')
    )
  );

-- Audit logging trigger function
CREATE OR REPLACE FUNCTION log_audit_event()
RETURNS TRIGGER AS $$
DECLARE
  v_old JSONB;
  v_new JSONB;
  v_action VARCHAR(50);
  v_is_critical BOOLEAN := false;
  v_company_id UUID;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_action := 'INSERT';
    v_new := to_jsonb(NEW);
    v_old := NULL;
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'UPDATE';
    v_old := to_jsonb(OLD);
    v_new := to_jsonb(NEW);
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'DELETE';
    v_old := to_jsonb(OLD);
    v_new := NULL;
  END IF;

  IF TG_TABLE_NAME IN ('payroll_runs', 'payslips', 'salary_structures') THEN
    v_is_critical := true;
  END IF;

  IF TG_TABLE_NAME = 'companies' THEN
    v_company_id := COALESCE(NEW.id, OLD.id);
  ELSIF TG_TABLE_NAME IN ('employees', 'departments', 'pay_grades', 'payroll_runs', 'leave_types', 'per_diem_rates', 'workflow_definitions', 'review_cycles', 'tasks') THEN
    v_company_id := COALESCE(NEW.company_id, OLD.company_id);
  ELSIF TG_TABLE_NAME IN ('payslips') THEN
    SELECT company_id INTO v_company_id FROM payroll_runs WHERE id = COALESCE(NEW.payroll_run_id, OLD.payroll_run_id);
  ELSIF TG_TABLE_NAME IN ('salary_structures', 'recurring_deductions', 'leave_balances', 'leave_requests', 'per_diem_requests', 'performance_reviews', 'promotion_requests') THEN
    SELECT company_id INTO v_company_id FROM employees WHERE id = COALESCE(NEW.employee_id, OLD.employee_id);
  END IF;

  INSERT INTO audit_logs (company_id, user_id, action, table_name, record_id, old_values, new_values, is_critical)
  VALUES (
    v_company_id,
    auth.uid(),
    v_action,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    v_old,
    v_new,
    v_is_critical
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS audit_payroll_runs ON payroll_runs;
CREATE TRIGGER audit_payroll_runs
  AFTER INSERT OR UPDATE OR DELETE ON payroll_runs
  FOR EACH ROW EXECUTE FUNCTION log_audit_event();

DROP TRIGGER IF EXISTS audit_payslips ON payslips;
CREATE TRIGGER audit_payslips
  AFTER INSERT OR UPDATE OR DELETE ON payslips
  FOR EACH ROW EXECUTE FUNCTION log_audit_event();

DROP TRIGGER IF EXISTS audit_salary_structures ON salary_structures;
CREATE TRIGGER audit_salary_structures
  AFTER INSERT OR UPDATE OR DELETE ON salary_structures
  FOR EACH ROW EXECUTE FUNCTION log_audit_event();

DROP TRIGGER IF EXISTS audit_employees ON employees;
CREATE TRIGGER audit_employees
  AFTER INSERT OR UPDATE OR DELETE ON employees
  FOR EACH ROW EXECUTE FUNCTION log_audit_event();

-- =====================================================
-- PART 3: APPROVAL WORKFLOW SYSTEM
-- =====================================================

CREATE TABLE IF NOT EXISTS workflow_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  steps JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workflow_definitions_company ON workflow_definitions(company_id);
CREATE INDEX IF NOT EXISTS idx_workflow_definitions_entity ON workflow_definitions(entity_type);

CREATE TABLE IF NOT EXISTS approval_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  workflow_id UUID REFERENCES workflow_definitions(id),
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  requester_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  current_step INTEGER DEFAULT 1,
  status VARCHAR(20) DEFAULT 'pending',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_approval_requests_company ON approval_requests(company_id);
CREATE INDEX IF NOT EXISTS idx_approval_requests_status ON approval_requests(status);
CREATE INDEX IF NOT EXISTS idx_approval_requests_entity ON approval_requests(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_approval_requests_requester ON approval_requests(requester_id);

CREATE TABLE IF NOT EXISTS approval_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID REFERENCES approval_requests(id) ON DELETE CASCADE,
  step_number INTEGER NOT NULL,
  approver_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  action VARCHAR(20) NOT NULL,
  comments TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_approval_actions_request ON approval_actions(request_id);

ALTER TABLE workflow_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_actions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view company workflows" ON workflow_definitions;
CREATE POLICY "Users can view company workflows" ON workflow_definitions
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Admin can manage workflows" ON workflow_definitions;
CREATE POLICY "Admin can manage workflows" ON workflow_definitions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.company_id = workflow_definitions.company_id
      AND u.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Users can view relevant approvals" ON approval_requests;
CREATE POLICY "Users can view relevant approvals" ON approval_requests
  FOR SELECT USING (
    requester_id IN (SELECT employee_id FROM users WHERE id = auth.uid())
    OR
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.company_id = approval_requests.company_id
      AND u.role IN ('admin', 'hr', 'management', 'finance')
    )
    OR
    EXISTS (
      SELECT 1 FROM users u
      JOIN employees e ON e.id = u.employee_id
      JOIN employees requester ON requester.id = approval_requests.requester_id
      WHERE u.id = auth.uid()
      AND requester.manager_id = e.id
    )
  );

DROP POLICY IF EXISTS "Users can insert approval requests" ON approval_requests;
CREATE POLICY "Users can insert approval requests" ON approval_requests
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update approval requests" ON approval_requests;
CREATE POLICY "Users can update approval requests" ON approval_requests
  FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Users can view approval actions" ON approval_actions;
CREATE POLICY "Users can view approval actions" ON approval_actions
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert approval actions" ON approval_actions;
CREATE POLICY "Users can insert approval actions" ON approval_actions
  FOR INSERT WITH CHECK (true);

-- =====================================================
-- PART 4: LEAVE MANAGEMENT
-- =====================================================

CREATE TABLE IF NOT EXISTS leave_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  days_per_year INTEGER NOT NULL,
  is_paid BOOLEAN DEFAULT true,
  requires_approval BOOLEAN DEFAULT true,
  carry_over_days INTEGER DEFAULT 0,
  gender_specific VARCHAR(10),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leave_types_company ON leave_types(company_id);

CREATE TABLE IF NOT EXISTS leave_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  leave_type_id UUID REFERENCES leave_types(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  entitled_days DECIMAL(5,2) NOT NULL,
  used_days DECIMAL(5,2) DEFAULT 0,
  carried_over DECIMAL(5,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(employee_id, leave_type_id, year)
);

CREATE INDEX IF NOT EXISTS idx_leave_balances_employee ON leave_balances(employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_balances_year ON leave_balances(year);

CREATE TABLE IF NOT EXISTS leave_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  leave_type_id UUID REFERENCES leave_types(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  days_requested DECIMAL(5,2) NOT NULL,
  reason TEXT,
  status VARCHAR(20) DEFAULT 'pending',
  line_manager_approved_by UUID REFERENCES employees(id),
  line_manager_approved_at TIMESTAMPTZ,
  hr_approved_by UUID REFERENCES employees(id),
  hr_approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leave_requests_employee ON leave_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON leave_requests(status);
CREATE INDEX IF NOT EXISTS idx_leave_requests_dates ON leave_requests(start_date, end_date);

ALTER TABLE leave_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view company leave types" ON leave_types;
CREATE POLICY "Users can view company leave types" ON leave_types
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Admin/HR can manage leave types" ON leave_types;
CREATE POLICY "Admin/HR can manage leave types" ON leave_types
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.company_id = leave_types.company_id
      AND u.role IN ('admin', 'hr')
    )
  );

DROP POLICY IF EXISTS "Employees can view own leave balances" ON leave_balances;
CREATE POLICY "Employees can view own leave balances" ON leave_balances
  FOR SELECT USING (
    employee_id IN (SELECT employee_id FROM users WHERE id = auth.uid())
    OR
    EXISTS (
      SELECT 1 FROM users u
      JOIN employees e ON e.company_id = u.company_id
      WHERE u.id = auth.uid()
      AND e.id = leave_balances.employee_id
      AND u.role IN ('admin', 'hr')
    )
  );

DROP POLICY IF EXISTS "Admin/HR can manage leave balances" ON leave_balances;
CREATE POLICY "Admin/HR can manage leave balances" ON leave_balances
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN employees e ON e.company_id = u.company_id
      WHERE u.id = auth.uid()
      AND e.id = leave_balances.employee_id
      AND u.role IN ('admin', 'hr')
    )
  );

DROP POLICY IF EXISTS "Users can view own or reportee leave requests" ON leave_requests;
CREATE POLICY "Users can view own or reportee leave requests" ON leave_requests
  FOR SELECT USING (
    employee_id IN (SELECT employee_id FROM users WHERE id = auth.uid())
    OR
    EXISTS (
      SELECT 1 FROM users u
      JOIN employees e ON e.id = u.employee_id
      JOIN employees requester ON requester.id = leave_requests.employee_id
      WHERE u.id = auth.uid()
      AND (requester.manager_id = e.id OR u.role IN ('admin', 'hr'))
    )
  );

DROP POLICY IF EXISTS "Employees can create own leave requests" ON leave_requests;
CREATE POLICY "Employees can create own leave requests" ON leave_requests
  FOR INSERT WITH CHECK (
    employee_id IN (SELECT employee_id FROM users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Authorized users can update leave requests" ON leave_requests;
CREATE POLICY "Authorized users can update leave requests" ON leave_requests
  FOR UPDATE USING (true);

-- =====================================================
-- PART 5: PER DIEM MANAGEMENT
-- =====================================================

CREATE TABLE IF NOT EXISTS per_diem_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  destination_type VARCHAR(50) NOT NULL,
  daily_rate DECIMAL(12,2) NOT NULL,
  accommodation_rate DECIMAL(12,2) DEFAULT 0,
  transport_rate DECIMAL(12,2) DEFAULT 0,
  effective_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_per_diem_rates_company ON per_diem_rates(company_id);

CREATE TABLE IF NOT EXISTS per_diem_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  rate_id UUID REFERENCES per_diem_rates(id),
  destination VARCHAR(255) NOT NULL,
  purpose TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  days INTEGER NOT NULL,
  daily_rate DECIMAL(12,2) NOT NULL,
  accommodation_amount DECIMAL(12,2) DEFAULT 0,
  transport_amount DECIMAL(12,2) DEFAULT 0,
  total_amount DECIMAL(12,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  line_manager_approved_by UUID REFERENCES employees(id),
  line_manager_approved_at TIMESTAMPTZ,
  finance_approved_by UUID REFERENCES employees(id),
  finance_approved_at TIMESTAMPTZ,
  management_approved_by UUID REFERENCES employees(id),
  management_approved_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_per_diem_requests_employee ON per_diem_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_per_diem_requests_status ON per_diem_requests(status);

ALTER TABLE per_diem_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE per_diem_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view company per diem rates" ON per_diem_rates;
CREATE POLICY "Users can view company per diem rates" ON per_diem_rates
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Admin/Finance can manage per diem rates" ON per_diem_rates;
CREATE POLICY "Admin/Finance can manage per diem rates" ON per_diem_rates
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.company_id = per_diem_rates.company_id
      AND u.role IN ('admin', 'finance')
    )
  );

DROP POLICY IF EXISTS "Users can view own or reportee per diem requests" ON per_diem_requests;
CREATE POLICY "Users can view own or reportee per diem requests" ON per_diem_requests
  FOR SELECT USING (
    employee_id IN (SELECT employee_id FROM users WHERE id = auth.uid())
    OR
    EXISTS (
      SELECT 1 FROM users u
      JOIN employees e ON e.id = u.employee_id
      JOIN employees requester ON requester.id = per_diem_requests.employee_id
      WHERE u.id = auth.uid()
      AND (requester.manager_id = e.id OR u.role IN ('admin', 'hr', 'finance', 'management'))
    )
  );

DROP POLICY IF EXISTS "Employees can create own per diem requests" ON per_diem_requests;
CREATE POLICY "Employees can create own per diem requests" ON per_diem_requests
  FOR INSERT WITH CHECK (
    employee_id IN (SELECT employee_id FROM users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Authorized users can update per diem requests" ON per_diem_requests;
CREATE POLICY "Authorized users can update per diem requests" ON per_diem_requests
  FOR UPDATE USING (true);

-- =====================================================
-- PART 6: TASK MANAGEMENT
-- =====================================================

CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES employees(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES employees(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  priority VARCHAR(20) DEFAULT 'medium',
  status VARCHAR(20) DEFAULT 'pending',
  due_date DATE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tasks_company ON tasks(company_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_by ON tasks(assigned_by);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);

CREATE TABLE IF NOT EXISTS task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  author_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_comments_task ON task_comments(task_id);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view assigned or created tasks" ON tasks;
CREATE POLICY "Users can view assigned or created tasks" ON tasks
  FOR SELECT USING (
    assigned_to IN (SELECT employee_id FROM users WHERE id = auth.uid())
    OR
    assigned_by IN (SELECT employee_id FROM users WHERE id = auth.uid())
    OR
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.company_id = tasks.company_id
      AND u.role IN ('admin', 'hr', 'management')
    )
  );

DROP POLICY IF EXISTS "Line managers can create tasks" ON tasks;
CREATE POLICY "Line managers can create tasks" ON tasks
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      LEFT JOIN employees e ON e.id = u.employee_id
      WHERE u.id = auth.uid()
      AND u.company_id = tasks.company_id
      AND (e.is_line_manager = true OR u.role IN ('admin', 'hr', 'management'))
    )
  );

DROP POLICY IF EXISTS "Assignees can update task status" ON tasks;
CREATE POLICY "Assignees can update task status" ON tasks
  FOR UPDATE USING (
    assigned_to IN (SELECT employee_id FROM users WHERE id = auth.uid())
    OR
    assigned_by IN (SELECT employee_id FROM users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can view task comments" ON task_comments;
CREATE POLICY "Users can view task comments" ON task_comments
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can create task comments" ON task_comments;
CREATE POLICY "Users can create task comments" ON task_comments
  FOR INSERT WITH CHECK (true);

-- =====================================================
-- PART 7: PERFORMANCE MANAGEMENT
-- =====================================================

CREATE TABLE IF NOT EXISTS review_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_review_cycles_company ON review_cycles(company_id);
CREATE INDEX IF NOT EXISTS idx_review_cycles_status ON review_cycles(status);

CREATE TABLE IF NOT EXISTS performance_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id UUID REFERENCES review_cycles(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  reviewer_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  self_assessment JSONB DEFAULT '{}',
  manager_assessment JSONB DEFAULT '{}',
  overall_rating DECIMAL(3,2),
  strengths TEXT,
  areas_for_improvement TEXT,
  goals_for_next_period JSONB DEFAULT '[]',
  status VARCHAR(20) DEFAULT 'pending',
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_performance_reviews_cycle ON performance_reviews(cycle_id);
CREATE INDEX IF NOT EXISTS idx_performance_reviews_employee ON performance_reviews(employee_id);
CREATE INDEX IF NOT EXISTS idx_performance_reviews_reviewer ON performance_reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_performance_reviews_status ON performance_reviews(status);

CREATE TABLE IF NOT EXISTS employee_kpis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  cycle_id UUID REFERENCES review_cycles(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  target_value DECIMAL(12,2),
  actual_value DECIMAL(12,2),
  unit VARCHAR(50),
  weight DECIMAL(5,2) DEFAULT 1.0,
  rating DECIMAL(3,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_employee_kpis_employee ON employee_kpis(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_kpis_cycle ON employee_kpis(cycle_id);

ALTER TABLE review_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_kpis ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view company review cycles" ON review_cycles;
CREATE POLICY "Users can view company review cycles" ON review_cycles
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Admin/HR can manage review cycles" ON review_cycles;
CREATE POLICY "Admin/HR can manage review cycles" ON review_cycles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.company_id = review_cycles.company_id
      AND u.role IN ('admin', 'hr')
    )
  );

DROP POLICY IF EXISTS "Users can view own or reportee reviews" ON performance_reviews;
CREATE POLICY "Users can view own or reportee reviews" ON performance_reviews
  FOR SELECT USING (
    employee_id IN (SELECT employee_id FROM users WHERE id = auth.uid())
    OR
    reviewer_id IN (SELECT employee_id FROM users WHERE id = auth.uid())
    OR
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role IN ('admin', 'hr', 'management')
    )
  );

DROP POLICY IF EXISTS "Users can view own KPIs" ON employee_kpis;
CREATE POLICY "Users can view own KPIs" ON employee_kpis
  FOR SELECT USING (
    employee_id IN (SELECT employee_id FROM users WHERE id = auth.uid())
    OR
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role IN ('admin', 'hr', 'management')
    )
  );

-- =====================================================
-- PART 8: PROMOTION REQUESTS
-- =====================================================

CREATE TABLE IF NOT EXISTS promotion_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  suggested_by UUID REFERENCES employees(id),
  current_job_role VARCHAR(255),
  proposed_job_role VARCHAR(255) NOT NULL,
  current_pay_grade_id UUID REFERENCES pay_grades(id),
  proposed_pay_grade_id UUID REFERENCES pay_grades(id),
  proposed_salary DECIMAL(12,2),
  justification TEXT NOT NULL,
  performance_review_id UUID REFERENCES performance_reviews(id),
  effective_date DATE,
  status VARCHAR(20) DEFAULT 'pending',
  approved_by UUID REFERENCES employees(id),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_promotion_requests_employee ON promotion_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_promotion_requests_status ON promotion_requests(status);

ALTER TABLE promotion_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "HR/Management can view promotions" ON promotion_requests;
CREATE POLICY "HR/Management can view promotions" ON promotion_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN employees e ON e.company_id = u.company_id
      WHERE u.id = auth.uid()
      AND e.id = promotion_requests.employee_id
      AND u.role IN ('admin', 'hr', 'management')
    )
  );

DROP POLICY IF EXISTS "HR can suggest promotions" ON promotion_requests;
CREATE POLICY "HR can suggest promotions" ON promotion_requests
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role IN ('admin', 'hr')
    )
  );

DROP POLICY IF EXISTS "HR can update promotions" ON promotion_requests;
CREATE POLICY "HR can update promotions" ON promotion_requests
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role IN ('admin', 'hr', 'management')
    )
  );

-- =====================================================
-- PART 9: DEPARTMENT DOCUMENTS
-- =====================================================

CREATE TABLE IF NOT EXISTS department_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id UUID REFERENCES departments(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT,
  file_url TEXT,
  version VARCHAR(20) DEFAULT '1.0',
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES employees(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_department_documents_department ON department_documents(department_id);
CREATE INDEX IF NOT EXISTS idx_department_documents_type ON department_documents(type);

ALTER TABLE department_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view department documents" ON department_documents;
CREATE POLICY "Users can view department documents" ON department_documents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN departments d ON d.company_id = u.company_id
      WHERE u.id = auth.uid()
      AND d.id = department_documents.department_id
    )
  );

DROP POLICY IF EXISTS "Line managers can manage department documents" ON department_documents;
CREATE POLICY "Line managers can manage department documents" ON department_documents
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN employees e ON e.id = u.employee_id
      JOIN departments d ON d.line_manager_id = e.id
      WHERE u.id = auth.uid()
      AND d.id = department_documents.department_id
    )
    OR
    EXISTS (
      SELECT 1 FROM users u
      JOIN departments d ON d.company_id = u.company_id
      WHERE u.id = auth.uid()
      AND d.id = department_documents.department_id
      AND u.role IN ('admin', 'hr')
    )
  );

-- =====================================================
-- PART 10: NOTIFICATION QUEUE
-- =====================================================

CREATE TABLE IF NOT EXISTS notification_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  recipient_email VARCHAR(255) NOT NULL,
  recipient_id UUID REFERENCES employees(id),
  subject VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  status VARCHAR(20) DEFAULT 'pending',
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_queue_status ON notification_queue(status);
CREATE INDEX IF NOT EXISTS idx_notification_queue_company ON notification_queue(company_id);
CREATE INDEX IF NOT EXISTS idx_notification_queue_recipient ON notification_queue(recipient_id);

ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- PART 11: SEED DEFAULT LEAVE TYPES
-- =====================================================

INSERT INTO leave_types (company_id, name, days_per_year, is_paid, carry_over_days, gender_specific)
SELECT id, 'Annual Leave', 21, true, 5, NULL FROM companies
WHERE NOT EXISTS (SELECT 1 FROM leave_types WHERE company_id = companies.id AND name = 'Annual Leave');

INSERT INTO leave_types (company_id, name, days_per_year, is_paid, carry_over_days, gender_specific)
SELECT id, 'Sick Leave', 30, true, 0, NULL FROM companies
WHERE NOT EXISTS (SELECT 1 FROM leave_types WHERE company_id = companies.id AND name = 'Sick Leave');

INSERT INTO leave_types (company_id, name, days_per_year, is_paid, carry_over_days, gender_specific)
SELECT id, 'Maternity Leave', 90, true, 0, 'female' FROM companies
WHERE NOT EXISTS (SELECT 1 FROM leave_types WHERE company_id = companies.id AND name = 'Maternity Leave');

INSERT INTO leave_types (company_id, name, days_per_year, is_paid, carry_over_days, gender_specific)
SELECT id, 'Paternity Leave', 14, true, 0, 'male' FROM companies
WHERE NOT EXISTS (SELECT 1 FROM leave_types WHERE company_id = companies.id AND name = 'Paternity Leave');

INSERT INTO leave_types (company_id, name, days_per_year, is_paid, carry_over_days, gender_specific)
SELECT id, 'Compassionate Leave', 5, true, 0, NULL FROM companies
WHERE NOT EXISTS (SELECT 1 FROM leave_types WHERE company_id = companies.id AND name = 'Compassionate Leave');

-- =====================================================
-- PART 12: DEFAULT WORKFLOW DEFINITIONS
-- =====================================================

INSERT INTO workflow_definitions (company_id, name, entity_type, steps)
SELECT id, 'Leave Request Approval', 'leave',
  '[{"order": 1, "role": "line_manager", "action": "approve", "required": true},
    {"order": 2, "role": "hr", "action": "approve", "required": true}]'::jsonb
FROM companies
WHERE NOT EXISTS (SELECT 1 FROM workflow_definitions WHERE company_id = companies.id AND entity_type = 'leave');

INSERT INTO workflow_definitions (company_id, name, entity_type, steps)
SELECT id, 'Per Diem Request Approval', 'per_diem',
  '[{"order": 1, "role": "line_manager", "action": "approve", "required": true},
    {"order": 2, "role": "finance", "action": "approve", "required": true},
    {"order": 3, "role": "management", "action": "approve", "required": false}]'::jsonb
FROM companies
WHERE NOT EXISTS (SELECT 1 FROM workflow_definitions WHERE company_id = companies.id AND entity_type = 'per_diem');

INSERT INTO workflow_definitions (company_id, name, entity_type, steps)
SELECT id, 'Payroll Approval', 'payroll',
  '[{"order": 1, "role": "finance", "action": "process", "required": true},
    {"order": 2, "role": "hr", "action": "approve", "required": true},
    {"order": 3, "role": "management", "action": "approve", "required": true}]'::jsonb
FROM companies
WHERE NOT EXISTS (SELECT 1 FROM workflow_definitions WHERE company_id = companies.id AND entity_type = 'payroll');

INSERT INTO workflow_definitions (company_id, name, entity_type, steps)
SELECT id, 'Promotion Approval', 'promotion',
  '[{"order": 1, "role": "line_manager", "action": "approve", "required": true},
    {"order": 2, "role": "hr", "action": "approve", "required": true},
    {"order": 3, "role": "management", "action": "approve", "required": true}]'::jsonb
FROM companies
WHERE NOT EXISTS (SELECT 1 FROM workflow_definitions WHERE company_id = companies.id AND entity_type = 'promotion');

-- =====================================================
-- PART 13: AUDIT TRIGGERS FOR NEW TABLES
-- =====================================================

DROP TRIGGER IF EXISTS audit_leave_requests ON leave_requests;
CREATE TRIGGER audit_leave_requests
  AFTER INSERT OR UPDATE OR DELETE ON leave_requests
  FOR EACH ROW EXECUTE FUNCTION log_audit_event();

DROP TRIGGER IF EXISTS audit_per_diem_requests ON per_diem_requests;
CREATE TRIGGER audit_per_diem_requests
  AFTER INSERT OR UPDATE OR DELETE ON per_diem_requests
  FOR EACH ROW EXECUTE FUNCTION log_audit_event();

DROP TRIGGER IF EXISTS audit_promotion_requests ON promotion_requests;
CREATE TRIGGER audit_promotion_requests
  AFTER INSERT OR UPDATE OR DELETE ON promotion_requests
  FOR EACH ROW EXECUTE FUNCTION log_audit_event();

-- Done!
SELECT 'Migration completed successfully!' as status;
