-- Kenya Payroll System - Platform Expansion Migration
-- Adds: Audit logging, Approval workflows, Leave management, Per diem, Tasks, Performance reviews, Promotions

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

-- Expand user roles (change column size to accommodate new roles)
ALTER TABLE users ALTER COLUMN role TYPE VARCHAR(30);

-- =====================================================
-- PART 2: AUDIT LOGGING SYSTEM
-- =====================================================

-- Audit logs table (critical for tracking all activities)
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action VARCHAR(50) NOT NULL, -- INSERT, UPDATE, DELETE, APPROVE, REJECT
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

-- Enable RLS on audit_logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admin/hr can view audit logs for their company
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

  -- Mark payroll-related changes as critical
  IF TG_TABLE_NAME IN ('payroll_runs', 'payslips', 'salary_structures') THEN
    v_is_critical := true;
  END IF;

  -- Get company_id based on table
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

-- Create audit triggers for critical tables
CREATE TRIGGER audit_payroll_runs
  AFTER INSERT OR UPDATE OR DELETE ON payroll_runs
  FOR EACH ROW EXECUTE FUNCTION log_audit_event();

CREATE TRIGGER audit_payslips
  AFTER INSERT OR UPDATE OR DELETE ON payslips
  FOR EACH ROW EXECUTE FUNCTION log_audit_event();

CREATE TRIGGER audit_salary_structures
  AFTER INSERT OR UPDATE OR DELETE ON salary_structures
  FOR EACH ROW EXECUTE FUNCTION log_audit_event();

CREATE TRIGGER audit_employees
  AFTER INSERT OR UPDATE OR DELETE ON employees
  FOR EACH ROW EXECUTE FUNCTION log_audit_event();

-- =====================================================
-- PART 3: APPROVAL WORKFLOW SYSTEM
-- =====================================================

-- Workflow definitions
CREATE TABLE IF NOT EXISTS workflow_definitions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL, -- leave, per_diem, payroll, promotion
  steps JSONB NOT NULL, -- Array of {order, role, action, required}
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workflow_definitions_company ON workflow_definitions(company_id);
CREATE INDEX IF NOT EXISTS idx_workflow_definitions_entity ON workflow_definitions(entity_type);

-- Approval requests
CREATE TABLE IF NOT EXISTS approval_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  workflow_id UUID REFERENCES workflow_definitions(id),
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  requester_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  current_step INTEGER DEFAULT 1,
  status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected, cancelled
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_approval_requests_company ON approval_requests(company_id);
CREATE INDEX IF NOT EXISTS idx_approval_requests_status ON approval_requests(status);
CREATE INDEX IF NOT EXISTS idx_approval_requests_entity ON approval_requests(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_approval_requests_requester ON approval_requests(requester_id);

-- Approval actions (individual approvals/rejections)
CREATE TABLE IF NOT EXISTS approval_actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id UUID REFERENCES approval_requests(id) ON DELETE CASCADE,
  step_number INTEGER NOT NULL,
  approver_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  action VARCHAR(20) NOT NULL, -- approved, rejected
  comments TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_approval_actions_request ON approval_actions(request_id);

-- Enable RLS
ALTER TABLE workflow_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_actions ENABLE ROW LEVEL SECURITY;

-- Policies for workflow_definitions
CREATE POLICY "Users can view company workflows" ON workflow_definitions
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Admin can manage workflows" ON workflow_definitions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.company_id = workflow_definitions.company_id
      AND u.role = 'admin'
    )
  );

-- Policies for approval_requests
CREATE POLICY "Users can view relevant approvals" ON approval_requests
  FOR SELECT USING (
    -- Requester can see their own requests
    requester_id IN (SELECT employee_id FROM users WHERE id = auth.uid())
    OR
    -- HR/Management/Admin can see all company requests
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.company_id = approval_requests.company_id
      AND u.role IN ('admin', 'hr', 'management', 'finance')
    )
    OR
    -- Line managers can see requests from their direct reports
    EXISTS (
      SELECT 1 FROM users u
      JOIN employees e ON e.id = u.employee_id
      JOIN employees requester ON requester.id = approval_requests.requester_id
      WHERE u.id = auth.uid()
      AND requester.manager_id = e.id
    )
  );

-- =====================================================
-- PART 4: LEAVE MANAGEMENT
-- =====================================================

-- Leave types
CREATE TABLE IF NOT EXISTS leave_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  days_per_year INTEGER NOT NULL,
  is_paid BOOLEAN DEFAULT true,
  requires_approval BOOLEAN DEFAULT true,
  carry_over_days INTEGER DEFAULT 0,
  gender_specific VARCHAR(10), -- NULL for all, 'male' or 'female' for specific
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leave_types_company ON leave_types(company_id);

-- Leave balances
CREATE TABLE IF NOT EXISTS leave_balances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

-- Leave requests
CREATE TABLE IF NOT EXISTS leave_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  leave_type_id UUID REFERENCES leave_types(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  days_requested DECIMAL(5,2) NOT NULL,
  reason TEXT,
  status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected, cancelled
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

-- Enable RLS
ALTER TABLE leave_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;

-- Policies for leave_types
CREATE POLICY "Users can view company leave types" ON leave_types
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Admin/HR can manage leave types" ON leave_types
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.company_id = leave_types.company_id
      AND u.role IN ('admin', 'hr')
    )
  );

-- Policies for leave_balances
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

-- Policies for leave_requests
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

CREATE POLICY "Employees can create own leave requests" ON leave_requests
  FOR INSERT WITH CHECK (
    employee_id IN (SELECT employee_id FROM users WHERE id = auth.uid())
  );

-- =====================================================
-- PART 5: PER DIEM MANAGEMENT
-- =====================================================

-- Per diem rates
CREATE TABLE IF NOT EXISTS per_diem_rates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  destination_type VARCHAR(50) NOT NULL, -- local, regional, international
  daily_rate DECIMAL(12,2) NOT NULL,
  accommodation_rate DECIMAL(12,2) DEFAULT 0,
  transport_rate DECIMAL(12,2) DEFAULT 0,
  effective_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_per_diem_rates_company ON per_diem_rates(company_id);

-- Per diem requests
CREATE TABLE IF NOT EXISTS per_diem_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
  status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected, paid
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

-- Enable RLS
ALTER TABLE per_diem_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE per_diem_requests ENABLE ROW LEVEL SECURITY;

-- Policies for per_diem_rates
CREATE POLICY "Users can view company per diem rates" ON per_diem_rates
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Admin/Finance can manage per diem rates" ON per_diem_rates
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.company_id = per_diem_rates.company_id
      AND u.role IN ('admin', 'finance')
    )
  );

-- Policies for per_diem_requests
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

CREATE POLICY "Employees can create own per diem requests" ON per_diem_requests
  FOR INSERT WITH CHECK (
    employee_id IN (SELECT employee_id FROM users WHERE id = auth.uid())
  );

-- =====================================================
-- PART 6: TASK MANAGEMENT
-- =====================================================

-- Tasks
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES employees(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES employees(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  priority VARCHAR(20) DEFAULT 'medium', -- low, medium, high, urgent
  status VARCHAR(20) DEFAULT 'pending', -- pending, in_progress, completed, cancelled
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

-- Task comments
CREATE TABLE IF NOT EXISTS task_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  author_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_comments_task ON task_comments(task_id);

-- Enable RLS
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;

-- Policies for tasks
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

CREATE POLICY "Line managers can create tasks" ON tasks
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      JOIN employees e ON e.id = u.employee_id
      WHERE u.id = auth.uid()
      AND u.company_id = tasks.company_id
      AND (e.is_line_manager = true OR u.role IN ('admin', 'hr', 'management'))
    )
  );

CREATE POLICY "Assignees can update task status" ON tasks
  FOR UPDATE USING (
    assigned_to IN (SELECT employee_id FROM users WHERE id = auth.uid())
    OR
    assigned_by IN (SELECT employee_id FROM users WHERE id = auth.uid())
  );

-- =====================================================
-- PART 7: PERFORMANCE MANAGEMENT
-- =====================================================

-- Performance review cycles
CREATE TABLE IF NOT EXISTS review_cycles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'draft', -- draft, active, completed
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_review_cycles_company ON review_cycles(company_id);
CREATE INDEX IF NOT EXISTS idx_review_cycles_status ON review_cycles(status);

-- Performance reviews
CREATE TABLE IF NOT EXISTS performance_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cycle_id UUID REFERENCES review_cycles(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  reviewer_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  self_assessment JSONB DEFAULT '{}',
  manager_assessment JSONB DEFAULT '{}',
  overall_rating DECIMAL(3,2), -- 1.00 to 5.00
  strengths TEXT,
  areas_for_improvement TEXT,
  goals_for_next_period JSONB DEFAULT '[]',
  status VARCHAR(20) DEFAULT 'pending', -- pending, self_review, manager_review, completed
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_performance_reviews_cycle ON performance_reviews(cycle_id);
CREATE INDEX IF NOT EXISTS idx_performance_reviews_employee ON performance_reviews(employee_id);
CREATE INDEX IF NOT EXISTS idx_performance_reviews_reviewer ON performance_reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_performance_reviews_status ON performance_reviews(status);

-- Employee KPIs (linked to review cycles)
CREATE TABLE IF NOT EXISTS employee_kpis (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

-- Enable RLS
ALTER TABLE review_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_kpis ENABLE ROW LEVEL SECURITY;

-- Policies for review_cycles
CREATE POLICY "Users can view company review cycles" ON review_cycles
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Admin/HR can manage review cycles" ON review_cycles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.company_id = review_cycles.company_id
      AND u.role IN ('admin', 'hr')
    )
  );

-- Policies for performance_reviews
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

-- =====================================================
-- PART 8: PROMOTION REQUESTS
-- =====================================================

-- Promotion requests
CREATE TABLE IF NOT EXISTS promotion_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
  status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected
  approved_by UUID REFERENCES employees(id),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_promotion_requests_employee ON promotion_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_promotion_requests_status ON promotion_requests(status);

-- Enable RLS
ALTER TABLE promotion_requests ENABLE ROW LEVEL SECURITY;

-- Policies for promotion_requests
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

CREATE POLICY "HR can suggest promotions" ON promotion_requests
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role IN ('admin', 'hr')
    )
  );

-- =====================================================
-- PART 9: DEPARTMENT DOCUMENTS (POLICIES/SOPs)
-- =====================================================

-- Department documents
CREATE TABLE IF NOT EXISTS department_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  department_id UUID REFERENCES departments(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- policy, sop, guideline
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

-- Enable RLS
ALTER TABLE department_documents ENABLE ROW LEVEL SECURITY;

-- Policies for department_documents
CREATE POLICY "Users can view department documents" ON department_documents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN departments d ON d.company_id = u.company_id
      WHERE u.id = auth.uid()
      AND d.id = department_documents.department_id
    )
  );

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

-- Notification queue
CREATE TABLE IF NOT EXISTS notification_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- payslip_ready, leave_approved, task_assigned, etc.
  recipient_email VARCHAR(255) NOT NULL,
  recipient_id UUID REFERENCES employees(id),
  subject VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  status VARCHAR(20) DEFAULT 'pending', -- pending, sent, failed
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_queue_status ON notification_queue(status);
CREATE INDEX IF NOT EXISTS idx_notification_queue_company ON notification_queue(company_id);
CREATE INDEX IF NOT EXISTS idx_notification_queue_recipient ON notification_queue(recipient_id);

-- Enable RLS (only system can access)
ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- PART 11: G9 VIEW (ALIAS FOR P9)
-- =====================================================

-- Create view for G9 records (Kenya's new tax form format)
CREATE OR REPLACE VIEW g9_records AS SELECT * FROM p9_records;

-- =====================================================
-- PART 12: UPDATE RLS POLICIES FOR NEW ROLES
-- =====================================================

-- Drop old policies that reference 'accountant' role
DROP POLICY IF EXISTS "Admin/Accountant can manage payroll" ON payroll_runs;
DROP POLICY IF EXISTS "Admin/Accountant can manage payslips" ON payslips;

-- Create new policies with updated roles
CREATE POLICY "Finance can manage payroll" ON payroll_runs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.company_id = payroll_runs.company_id
      AND u.role IN ('admin', 'finance')
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

-- Update payslip view policy to include finance role
DROP POLICY IF EXISTS "Employees can view own payslips" ON payslips;
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

-- Update P9/G9 view policy
DROP POLICY IF EXISTS "Employees can view own P9 records" ON p9_records;
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
-- PART 13: SEED DEFAULT LEAVE TYPES (PER COMPANY)
-- =====================================================

-- Function to create default leave types for a company
CREATE OR REPLACE FUNCTION create_default_leave_types()
RETURNS TRIGGER AS $$
BEGIN
  -- Annual Leave (21 days - Kenya Employment Act)
  INSERT INTO leave_types (company_id, name, days_per_year, is_paid, carry_over_days)
  VALUES (NEW.id, 'Annual Leave', 21, true, 5);

  -- Sick Leave (30 days with medical certificate)
  INSERT INTO leave_types (company_id, name, days_per_year, is_paid, carry_over_days)
  VALUES (NEW.id, 'Sick Leave', 30, true, 0);

  -- Maternity Leave (90 days - Kenya Employment Act)
  INSERT INTO leave_types (company_id, name, days_per_year, is_paid, carry_over_days, gender_specific)
  VALUES (NEW.id, 'Maternity Leave', 90, true, 0, 'female');

  -- Paternity Leave (14 days - Kenya Employment Act)
  INSERT INTO leave_types (company_id, name, days_per_year, is_paid, carry_over_days, gender_specific)
  VALUES (NEW.id, 'Paternity Leave', 14, true, 0, 'male');

  -- Compassionate Leave (5 days)
  INSERT INTO leave_types (company_id, name, days_per_year, is_paid, carry_over_days)
  VALUES (NEW.id, 'Compassionate Leave', 5, true, 0);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create default leave types when a new company is created
CREATE TRIGGER create_company_leave_types
  AFTER INSERT ON companies
  FOR EACH ROW EXECUTE FUNCTION create_default_leave_types();

-- Insert default leave types for existing companies
INSERT INTO leave_types (company_id, name, days_per_year, is_paid, carry_over_days, gender_specific)
SELECT id, 'Annual Leave', 21, true, 5, NULL FROM companies
WHERE NOT EXISTS (SELECT 1 FROM leave_types WHERE company_id = companies.id AND name = 'Annual Leave')
UNION ALL
SELECT id, 'Sick Leave', 30, true, 0, NULL FROM companies
WHERE NOT EXISTS (SELECT 1 FROM leave_types WHERE company_id = companies.id AND name = 'Sick Leave')
UNION ALL
SELECT id, 'Maternity Leave', 90, true, 0, 'female' FROM companies
WHERE NOT EXISTS (SELECT 1 FROM leave_types WHERE company_id = companies.id AND name = 'Maternity Leave')
UNION ALL
SELECT id, 'Paternity Leave', 14, true, 0, 'male' FROM companies
WHERE NOT EXISTS (SELECT 1 FROM leave_types WHERE company_id = companies.id AND name = 'Paternity Leave')
UNION ALL
SELECT id, 'Compassionate Leave', 5, true, 0, NULL FROM companies
WHERE NOT EXISTS (SELECT 1 FROM leave_types WHERE company_id = companies.id AND name = 'Compassionate Leave');

-- =====================================================
-- PART 14: DEFAULT WORKFLOW DEFINITIONS
-- =====================================================

-- Function to create default workflows for a company
CREATE OR REPLACE FUNCTION create_default_workflows()
RETURNS TRIGGER AS $$
BEGIN
  -- Leave Request Workflow
  INSERT INTO workflow_definitions (company_id, name, entity_type, steps)
  VALUES (NEW.id, 'Leave Request Approval', 'leave',
    '[{"order": 1, "role": "line_manager", "action": "approve", "required": true},
      {"order": 2, "role": "hr", "action": "approve", "required": true}]'::jsonb);

  -- Per Diem Request Workflow
  INSERT INTO workflow_definitions (company_id, name, entity_type, steps)
  VALUES (NEW.id, 'Per Diem Request Approval', 'per_diem',
    '[{"order": 1, "role": "line_manager", "action": "approve", "required": true},
      {"order": 2, "role": "finance", "action": "approve", "required": true},
      {"order": 3, "role": "management", "action": "approve", "required": false}]'::jsonb);

  -- Payroll Approval Workflow
  INSERT INTO workflow_definitions (company_id, name, entity_type, steps)
  VALUES (NEW.id, 'Payroll Approval', 'payroll',
    '[{"order": 1, "role": "finance", "action": "process", "required": true},
      {"order": 2, "role": "hr", "action": "approve", "required": true},
      {"order": 3, "role": "management", "action": "approve", "required": true}]'::jsonb);

  -- Promotion Approval Workflow
  INSERT INTO workflow_definitions (company_id, name, entity_type, steps)
  VALUES (NEW.id, 'Promotion Approval', 'promotion',
    '[{"order": 1, "role": "hr", "action": "suggest", "required": true},
      {"order": 2, "role": "management", "action": "approve", "required": true}]'::jsonb);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create default workflows when a new company is created
CREATE TRIGGER create_company_workflows
  AFTER INSERT ON companies
  FOR EACH ROW EXECUTE FUNCTION create_default_workflows();

-- Insert default workflows for existing companies
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
  '[{"order": 1, "role": "hr", "action": "suggest", "required": true},
    {"order": 2, "role": "management", "action": "approve", "required": true}]'::jsonb
FROM companies
WHERE NOT EXISTS (SELECT 1 FROM workflow_definitions WHERE company_id = companies.id AND entity_type = 'promotion');

-- Add audit triggers for new tables
CREATE TRIGGER audit_leave_requests
  AFTER INSERT OR UPDATE OR DELETE ON leave_requests
  FOR EACH ROW EXECUTE FUNCTION log_audit_event();

CREATE TRIGGER audit_per_diem_requests
  AFTER INSERT OR UPDATE OR DELETE ON per_diem_requests
  FOR EACH ROW EXECUTE FUNCTION log_audit_event();

CREATE TRIGGER audit_promotion_requests
  AFTER INSERT OR UPDATE OR DELETE ON promotion_requests
  FOR EACH ROW EXECUTE FUNCTION log_audit_event();
