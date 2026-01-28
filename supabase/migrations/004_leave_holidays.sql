-- Add holidays table used for leave working-day calculations

CREATE TABLE IF NOT EXISTS holidays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  name VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, date)
);

CREATE INDEX IF NOT EXISTS idx_holidays_company_date ON holidays(company_id, date);

ALTER TABLE holidays ENABLE ROW LEVEL SECURITY;

-- Users can view company holidays
DROP POLICY IF EXISTS "Users can view company holidays" ON holidays;
CREATE POLICY "Users can view company holidays" ON holidays
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
  );

-- Admin/HR can manage holidays
DROP POLICY IF EXISTS "Admin/HR can manage holidays" ON holidays;
CREATE POLICY "Admin/HR can manage holidays" ON holidays
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.company_id = holidays.company_id
      AND u.role IN ('admin', 'hr')
    )
  );
