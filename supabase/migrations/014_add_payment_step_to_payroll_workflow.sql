-- Add payment step to payroll workflow
-- Step 1: Finance reconciles (after HR processes)
-- Step 2: Management approves
-- Step 3: Management submits for payment
-- Step 4: Finance marks as paid

UPDATE workflow_definitions
SET steps = '[
  {"order": 1, "role": "finance", "action": "reconcile", "required": true},
  {"order": 2, "role": "management", "action": "approve", "required": true},
  {"order": 3, "role": "management", "action": "submit_payment", "required": true},
  {"order": 4, "role": "finance", "action": "mark_paid", "required": true}
]'::jsonb
WHERE entity_type = 'payroll';
