-- Fix existing payrolls with hr_pending status
-- These were created before migration 015 was run
-- Update them to finance_pending to work with the new 2-step workflow

UPDATE payroll_runs
SET status = 'finance_pending'
WHERE status = 'hr_pending';

-- Also update any approval requests for these payrolls to start at step 1 (Finance)
-- Note: The workflow now has Finance as step 1, Management as step 2
