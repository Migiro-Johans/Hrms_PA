-- Simplify payroll workflow to 3 steps
-- Step 1: HR submits to Finance for reconciliation
-- Step 2: Finance reconciles and submits to Management
-- Step 3: Management approves and marks as paid

-- First, clean up old payroll data from previous workflow
-- Delete payslips associated with old payroll runs
DELETE FROM payslips 
WHERE payroll_run_id IN (
  SELECT id FROM payroll_runs 
  WHERE status IN ('hr_pending', 'finance_pending', 'mgmt_pending', 'payment_pending', 'hr_rejected', 'finance_rejected', 'mgmt_rejected', 'payment_rejected')
);

-- Delete approval actions for old payroll approval requests
DELETE FROM approval_actions 
WHERE request_id IN (
  SELECT id FROM approval_requests 
  WHERE entity_type = 'payroll'
);

-- Delete old approval requests for payroll
DELETE FROM approval_requests 
WHERE entity_type = 'payroll';

-- Delete old payroll runs that are not completed
DELETE FROM payroll_runs 
WHERE status IN ('hr_pending', 'finance_pending', 'mgmt_pending', 'payment_pending', 'hr_rejected', 'finance_rejected', 'mgmt_rejected', 'payment_rejected');

-- Keep only draft and paid payrolls
-- Draft payrolls can be reprocessed with the new workflow
-- Paid payrolls are historical records and should be preserved

-- Update workflow definition to 3-step order
UPDATE workflow_definitions
SET steps = '[
  {"order": 1, "role": "hr", "action": "submit", "required": true},
  {"order": 2, "role": "finance", "action": "reconcile", "required": true},
  {"order": 3, "role": "management", "action": "approve_and_pay", "required": true}
]'::jsonb
WHERE entity_type = 'payroll';
