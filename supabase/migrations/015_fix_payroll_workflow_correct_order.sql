-- Fix payroll workflow to correct order
-- Step 1: HR approves/submits (after processing)
-- Step 2: Finance reconciles/approves
-- Step 3: Management approves and submits for payment
-- Step 4: Finance marks as paid

-- First, clean up old payroll data from previous workflow
-- Delete payslips associated with old payroll runs
DELETE FROM payslips 
WHERE payroll_run_id IN (
  SELECT id FROM payroll_runs 
  WHERE status IN ('finance_pending', 'mgmt_pending', 'payment_pending', 'finance_rejected', 'mgmt_rejected', 'payment_rejected')
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
WHERE status IN ('finance_pending', 'mgmt_pending', 'payment_pending', 'finance_rejected', 'mgmt_rejected', 'payment_rejected');

-- Keep only draft and paid payrolls
-- Draft payrolls can be reprocessed with the new workflow
-- Paid payrolls are historical records and should be preserved

-- Update workflow definition to correct 4-step order
UPDATE workflow_definitions
SET steps = '[
  {"order": 1, "role": "hr", "action": "submit", "required": true},
  {"order": 2, "role": "finance", "action": "reconcile", "required": true},
  {"order": 3, "role": "management", "action": "approve", "required": true},
  {"order": 4, "role": "finance", "action": "payment", "required": true}
]'::jsonb
WHERE entity_type = 'payroll';
