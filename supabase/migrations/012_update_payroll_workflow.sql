-- Update payroll approval workflow
-- New workflow: HR processes → Finance reconciles → Management approves → Paid
-- Old workflow: Finance processes → HR approves → Management approves → Paid

-- Add finance_approved_at column if it doesn't exist (finance_approved_by already exists)
ALTER TABLE payroll_runs 
  ADD COLUMN IF NOT EXISTS finance_approved_at TIMESTAMPTZ;

-- Update existing statuses to match new workflow
-- hr_pending → finance_pending (awaiting finance reconciliation)
UPDATE payroll_runs 
SET status = 'finance_pending' 
WHERE status = 'hr_pending';

-- hr_rejected → finance_rejected (rejected by finance)
UPDATE payroll_runs 
SET status = 'finance_rejected' 
WHERE status = 'hr_rejected';

-- Copy hr_approved_by to finance_approved_by for historical records
UPDATE payroll_runs 
SET 
  finance_approved_by = hr_approved_by,
  finance_approved_at = hr_approved_at
WHERE hr_approved_by IS NOT NULL;

-- Note: Keep hr_approved_by and hr_approved_at columns for historical data
-- But they won't be used in the new workflow

SELECT '012 Payroll workflow updated: HR processes, Finance reconciles, Management approves' as status;
