-- Fix payroll workflow definition to match new workflow
-- Step 1: Finance reconciles (after HR processes)
-- Step 2: Management approves

UPDATE workflow_definitions
SET steps = '[
  {"order": 1, "role": "finance", "action": "reconcile", "required": true},
  {"order": 2, "role": "management", "action": "approve", "required": true}
]'::jsonb
WHERE entity_type = 'payroll';
