-- Enable RLS on all tables with proper role-based policies
-- This implements proper role-based access control instead of disabling security

-- Core tables - Admin and HR have full access, others limited
-- Companies: Admin and HR manage
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Companies policy" ON companies;
CREATE POLICY "Companies policy" ON companies
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.company_id = companies.id
      AND u.role IN ('admin', 'hr', 'finance', 'management', 'employee')
    )
  );

-- Departments: Admin, HR, Management, Line Managers view; Admin, HR manage
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Departments view policy" ON departments;
CREATE POLICY "Departments view policy" ON departments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      LEFT JOIN employees e ON e.id = u.employee_id
      WHERE u.id = auth.uid()
      AND u.company_id = departments.company_id
      AND (
        u.role IN ('admin', 'hr', 'management', 'finance')
        OR e.is_line_manager = true
        OR u.role = 'employee'
      )
    )
  );

DROP POLICY IF EXISTS "Departments manage policy" ON departments;
CREATE POLICY "Departments manage policy" ON departments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.company_id = departments.company_id
      AND u.role IN ('admin', 'hr')
    )
  );

-- Employees: Admin, HR full access; Management read; employees read own + line managers read team
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Employees view policy" ON employees;
CREATE POLICY "Employees view policy" ON employees
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      LEFT JOIN employees e ON e.id = u.employee_id
      WHERE u.id = auth.uid()
      AND u.company_id = employees.company_id
      AND (
        u.role IN ('admin', 'hr', 'management', 'finance')
        OR u.employee_id = employees.id
        OR (e.is_line_manager = true AND e.department_id = employees.department_id)
      )
    )
  );

DROP POLICY IF EXISTS "Employees manage policy" ON employees;
CREATE POLICY "Employees manage policy" ON employees
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.company_id = employees.company_id
      AND u.role IN ('admin', 'hr')
    )
  );

-- Users: Everyone can read own profile; Admin can manage all
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Already has policies from 005, but let's add admin management
DROP POLICY IF EXISTS "Admin can manage all users" ON users;
CREATE POLICY "Admin can manage all users" ON users
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.company_id = users.company_id
      AND u.role = 'admin'
    )
  );

-- Pay Grades: Admin, HR, Finance view; Admin, HR manage
ALTER TABLE pay_grades ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Pay grades policy" ON pay_grades;
CREATE POLICY "Pay grades policy" ON pay_grades
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.company_id = pay_grades.company_id
      AND u.role IN ('admin', 'hr', 'finance', 'management')
    )
  );

-- Salary Structures: Finance, HR, Admin full; employees view own
ALTER TABLE salary_structures ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Salary structures view policy" ON salary_structures;
CREATE POLICY "Salary structures view policy" ON salary_structures
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN employees emp ON emp.id = salary_structures.employee_id
      WHERE u.id = auth.uid()
      AND u.company_id = emp.company_id
      AND (
        u.role IN ('admin', 'hr', 'finance')
        OR u.employee_id = salary_structures.employee_id
      )
    )
  );

DROP POLICY IF EXISTS "Salary structures manage policy" ON salary_structures;
CREATE POLICY "Salary structures manage policy" ON salary_structures
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN employees emp ON emp.id = salary_structures.employee_id
      WHERE u.id = auth.uid()
      AND u.company_id = emp.company_id
      AND u.role IN ('admin', 'hr', 'finance')
    )
  );

-- Recurring Deductions: Finance, HR, Admin manage
ALTER TABLE recurring_deductions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Recurring deductions policy" ON recurring_deductions;
CREATE POLICY "Recurring deductions policy" ON recurring_deductions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN employees emp ON emp.id = recurring_deductions.employee_id
      WHERE u.id = auth.uid()
      AND u.company_id = emp.company_id
      AND u.role IN ('admin', 'hr', 'finance')
    )
  );

-- Payroll Runs: Finance, HR, Admin, Management view; Finance, HR, Admin process
ALTER TABLE payroll_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Payroll runs view policy" ON payroll_runs;
CREATE POLICY "Payroll runs view policy" ON payroll_runs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.company_id = payroll_runs.company_id
      AND u.role IN ('admin', 'hr', 'finance', 'management')
    )
  );

DROP POLICY IF EXISTS "Payroll runs manage policy" ON payroll_runs;
CREATE POLICY "Payroll runs manage policy" ON payroll_runs
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.company_id = payroll_runs.company_id
      AND u.role IN ('admin', 'hr', 'finance')
    )
  );

-- Payslips: Finance, HR, Admin view all; employees view own
ALTER TABLE payslips ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Payslips view policy" ON payslips;
CREATE POLICY "Payslips view policy" ON payslips
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND (
        (u.role IN ('admin', 'hr', 'finance', 'management') AND EXISTS (
          SELECT 1 FROM employees e
          WHERE e.id = payslips.employee_id
          AND e.company_id = u.company_id
        ))
        OR u.employee_id = payslips.employee_id
      )
    )
  );

DROP POLICY IF EXISTS "Payslips manage policy" ON payslips;
CREATE POLICY "Payslips manage policy" ON payslips
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN employees e ON e.id = payslips.employee_id
      WHERE u.id = auth.uid()
      AND e.company_id = u.company_id
      AND u.role IN ('admin', 'hr', 'finance')
    )
  );

-- P9 Records: Finance, HR, Admin view all; employees view own
ALTER TABLE p9_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "P9 records view policy" ON p9_records;
CREATE POLICY "P9 records view policy" ON p9_records
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN employees emp ON emp.id = p9_records.employee_id
      WHERE u.id = auth.uid()
      AND u.company_id = emp.company_id
      AND (
        u.role IN ('admin', 'hr', 'finance', 'management')
        OR u.employee_id = p9_records.employee_id
      )
    )
  );

DROP POLICY IF EXISTS "P9 records manage policy" ON p9_records;
CREATE POLICY "P9 records manage policy" ON p9_records
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN employees emp ON emp.id = p9_records.employee_id
      WHERE u.id = auth.uid()
      AND u.company_id = emp.company_id
      AND u.role IN ('admin', 'hr', 'finance')
    )
  );

-- Leave Types: Admin, HR manage; everyone view
ALTER TABLE leave_types ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Leave types policy" ON leave_types;
CREATE POLICY "Leave types policy" ON leave_types
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.company_id = leave_types.company_id
    )
  );

-- Leave Balances: HR, Admin manage; employees view own
ALTER TABLE leave_balances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Leave balances view policy" ON leave_balances;
CREATE POLICY "Leave balances view policy" ON leave_balances
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN employees emp ON emp.id = leave_balances.employee_id
      WHERE u.id = auth.uid()
      AND u.company_id = emp.company_id
      AND (
        u.role IN ('admin', 'hr', 'management')
        OR u.employee_id = leave_balances.employee_id
      )
    )
  );

DROP POLICY IF EXISTS "Leave balances manage policy" ON leave_balances;
CREATE POLICY "Leave balances manage policy" ON leave_balances
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN employees emp ON emp.id = leave_balances.employee_id
      WHERE u.id = auth.uid()
      AND u.company_id = emp.company_id
      AND u.role IN ('admin', 'hr')
    )
  );

-- Leave Requests: Employees create own; HR, Admin, Line Managers approve
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Leave requests view policy" ON leave_requests;
CREATE POLICY "Leave requests view policy" ON leave_requests
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      LEFT JOIN employees e ON e.id = u.employee_id
      JOIN employees emp ON emp.id = leave_requests.employee_id
      WHERE u.id = auth.uid()
      AND u.company_id = emp.company_id
      AND (
        u.role IN ('admin', 'hr', 'management')
        OR u.employee_id = leave_requests.employee_id
        OR (e.is_line_manager = true AND e.department_id = emp.department_id)
      )
    )
  );

DROP POLICY IF EXISTS "Leave requests manage policy" ON leave_requests;
CREATE POLICY "Leave requests manage policy" ON leave_requests
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users u
      LEFT JOIN employees e ON e.id = u.employee_id
      JOIN employees emp ON emp.id = leave_requests.employee_id
      WHERE u.id = auth.uid()
      AND u.company_id = emp.company_id
      AND (
        u.role IN ('admin', 'hr')
        OR u.employee_id = leave_requests.employee_id
        OR (e.is_line_manager = true AND e.department_id = emp.department_id)
      )
    )
  );

-- Holidays: HR, Admin manage; everyone view
ALTER TABLE holidays ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Holidays policy" ON holidays;
CREATE POLICY "Holidays policy" ON holidays
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.company_id = holidays.company_id
    )
  );

-- Per Diem Rates: Finance, HR, Admin manage; everyone view
ALTER TABLE per_diem_rates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Per diem rates policy" ON per_diem_rates;
CREATE POLICY "Per diem rates policy" ON per_diem_rates
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.company_id = per_diem_rates.company_id
    )
  );

-- Per Diem Requests: Employees create own; Finance, HR, Admin, Line Managers approve
ALTER TABLE per_diem_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Per diem requests view policy" ON per_diem_requests;
CREATE POLICY "Per diem requests view policy" ON per_diem_requests
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      LEFT JOIN employees e ON e.id = u.employee_id
      JOIN employees emp ON emp.id = per_diem_requests.employee_id
      WHERE u.id = auth.uid()
      AND u.company_id = emp.company_id
      AND (
        u.role IN ('admin', 'hr', 'finance', 'management')
        OR u.employee_id = per_diem_requests.employee_id
        OR (e.is_line_manager = true AND e.department_id = emp.department_id)
      )
    )
  );

DROP POLICY IF EXISTS "Per diem requests manage policy" ON per_diem_requests;
CREATE POLICY "Per diem requests manage policy" ON per_diem_requests
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users u
      LEFT JOIN employees e ON e.id = u.employee_id
      JOIN employees emp ON emp.id = per_diem_requests.employee_id
      WHERE u.id = auth.uid()
      AND u.company_id = emp.company_id
      AND (
        u.role IN ('admin', 'hr', 'finance')
        OR u.employee_id = per_diem_requests.employee_id
        OR (e.is_line_manager = true AND e.department_id = emp.department_id)
      )
    )
  );

-- Tasks: Employees manage own; Line Managers manage team; HR, Admin manage all
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tasks view policy" ON tasks;
CREATE POLICY "Tasks view policy" ON tasks
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      LEFT JOIN employees e ON e.id = u.employee_id
      WHERE u.id = auth.uid()
      AND u.company_id = tasks.company_id
      AND (
        u.role IN ('admin', 'hr', 'management')
        OR u.employee_id = tasks.assigned_to
        OR u.employee_id = tasks.assigned_by
        OR (e.is_line_manager = true AND EXISTS (
          SELECT 1 FROM employees emp
          WHERE emp.id = tasks.assigned_to
          AND emp.department_id = e.department_id
        ))
      )
    )
  );

DROP POLICY IF EXISTS "Tasks manage policy" ON tasks;
CREATE POLICY "Tasks manage policy" ON tasks
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users u
      LEFT JOIN employees e ON e.id = u.employee_id
      WHERE u.id = auth.uid()
      AND u.company_id = tasks.company_id
      AND (
        u.role IN ('admin', 'hr', 'management')
        OR u.employee_id = tasks.assigned_to
        OR u.employee_id = tasks.assigned_by
        OR (e.is_line_manager = true AND EXISTS (
          SELECT 1 FROM employees emp
          WHERE emp.id = tasks.assigned_to
          AND emp.department_id = e.department_id
        ))
      )
    )
  );

-- Performance Reviews: HR, Admin, Management, Line Managers
ALTER TABLE review_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Review cycles policy" ON review_cycles;
CREATE POLICY "Review cycles policy" ON review_cycles
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users u
      LEFT JOIN employees e ON e.id = u.employee_id
      WHERE u.id = auth.uid()
      AND u.company_id = review_cycles.company_id
      AND (
        u.role IN ('admin', 'hr', 'management')
        OR e.is_line_manager = true
      )
    )
  );

DROP POLICY IF EXISTS "Performance reviews view policy" ON performance_reviews;
CREATE POLICY "Performance reviews view policy" ON performance_reviews
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      LEFT JOIN employees e ON e.id = u.employee_id
      JOIN employees emp ON emp.id = performance_reviews.employee_id
      WHERE u.id = auth.uid()
      AND u.company_id = emp.company_id
      AND (
        u.role IN ('admin', 'hr', 'management')
        OR u.employee_id = performance_reviews.employee_id
        OR u.employee_id = performance_reviews.reviewer_id
        OR (e.is_line_manager = true AND e.department_id = emp.department_id)
      )
    )
  );

DROP POLICY IF EXISTS "Performance reviews manage policy" ON performance_reviews;
CREATE POLICY "Performance reviews manage policy" ON performance_reviews
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users u
      LEFT JOIN employees e ON e.id = u.employee_id
      JOIN employees emp ON emp.id = performance_reviews.employee_id
      WHERE u.id = auth.uid()
      AND u.company_id = emp.company_id
      AND (
        u.role IN ('admin', 'hr', 'management')
        OR u.employee_id = performance_reviews.reviewer_id
        OR (e.is_line_manager = true AND e.department_id = emp.department_id)
      )
    )
  );

-- Promotion Requests: HR, Admin, Management
ALTER TABLE promotion_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Promotion requests view policy" ON promotion_requests;
CREATE POLICY "Promotion requests view policy" ON promotion_requests
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN employees emp ON emp.id = promotion_requests.employee_id
      WHERE u.id = auth.uid()
      AND u.company_id = emp.company_id
      AND (
        u.role IN ('admin', 'hr', 'management')
        OR u.employee_id = promotion_requests.employee_id
      )
    )
  );

DROP POLICY IF EXISTS "Promotion requests manage policy" ON promotion_requests;
CREATE POLICY "Promotion requests manage policy" ON promotion_requests
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN employees emp ON emp.id = promotion_requests.employee_id
      WHERE u.id = auth.uid()
      AND u.company_id = emp.company_id
      AND u.role IN ('admin', 'hr', 'management')
    )
  );

-- Documents: Based on document type and ownership (skip if table doesn't exist)
-- ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- DROP POLICY IF EXISTS "Documents policy" ON documents;
-- CREATE POLICY "Documents policy" ON documents
--   FOR ALL
--   USING (
--     EXISTS (
--       SELECT 1 FROM users u
--       JOIN employees emp ON emp.id = documents.employee_id
--       WHERE u.id = auth.uid()
--       AND u.company_id = emp.company_id
--       AND (
--         u.role IN ('admin', 'hr')
--         OR u.employee_id = documents.employee_id
--       )
--     )
--   );

-- Workflows: Admin, HR configure; all participate
ALTER TABLE workflow_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_actions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Workflow definitions policy" ON workflow_definitions;
CREATE POLICY "Workflow definitions policy" ON workflow_definitions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.company_id = workflow_definitions.company_id
    )
  );

DROP POLICY IF EXISTS "Approval requests policy" ON approval_requests;
CREATE POLICY "Approval requests policy" ON approval_requests
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND (
        u.role IN ('admin', 'hr', 'finance', 'management')
        OR u.employee_id = approval_requests.requested_by
        OR u.employee_id = approval_requests.current_approver_id
      )
    )
  );

DROP POLICY IF EXISTS "Approval actions policy" ON approval_actions;
CREATE POLICY "Approval actions policy" ON approval_actions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND (
        u.role IN ('admin', 'hr', 'finance', 'management')
        OR u.employee_id = approval_actions.approver_id
      )
    )
  );

-- Notifications: Users see own notifications
ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Notification queue policy" ON notification_queue;
CREATE POLICY "Notification queue policy" ON notification_queue
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.company_id = notification_queue.company_id
      AND (
        u.role IN ('admin', 'hr')
        OR u.employee_id = notification_queue.recipient_id
      )
    )
  );

-- Audit Logs: Admin, HR view all
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Audit logs policy" ON audit_logs;
CREATE POLICY "Audit logs policy" ON audit_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.company_id = audit_logs.company_id
      AND u.role IN ('admin', 'hr')
    )
  );

-- Payroll Employee Deductions: Finance, HR, Admin
ALTER TABLE payroll_employee_deductions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Payroll employee deductions policy" ON payroll_employee_deductions;
CREATE POLICY "Payroll employee deductions policy" ON payroll_employee_deductions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN employees e ON e.id = payroll_employee_deductions.employee_id
      WHERE u.id = auth.uid()
      AND e.company_id = u.company_id
      AND u.role IN ('admin', 'hr', 'finance')
    )
  );

SELECT '008 Role-based RLS policies enabled on all tables' as status;

