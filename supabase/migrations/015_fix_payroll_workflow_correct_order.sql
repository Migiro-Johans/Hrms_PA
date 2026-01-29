-- Fix payroll workflow to correct order
-- Step 1: HR approves/submits (after processing)
-- Step 2: Finance reconciles/approves
-- Step 3: Management approves and submits for payment
-- Step 4: Finance marks as paid

UPDATE workflow_definitions
SET steps = '[
  {"order": 1, "role": "hr", "action": "submit", "required": true},
  {"order": 2, "role": "finance", "action": "reconcile", "required": true},
  {"order": 3, "role": "management", "action": "approve", "required": true},
  {"order": 4, "role": "finance", "action": "payment", "required": true}
]'::jsonb
WHERE entity_type = 'payroll';
