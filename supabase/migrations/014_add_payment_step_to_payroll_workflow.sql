-- Add payment step to payroll workflow
-- Step 1: Finance reconciles (after HR processes)
-- Step 2: Management approves
-- Step 3: Finance makes payment

UPDATE workflow_definitions
SET steps = '[
  {"order": 1, "role": "finance", "action": "reconcile", "required": true},
  {"order": 2, "role": "management", "action": "approve", "required": true},
  {"order": 3, "role": "finance", "action": "payment", "required": true}
]'::jsonb
WHERE entity_type = 'payroll';
