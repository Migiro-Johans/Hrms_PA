-- Fix RLS policies to allow service role access
-- Run this in Supabase Dashboard > SQL Editor

-- The service_role key should bypass RLS automatically, but if it doesn't,
-- we need to ensure the policies don't restrict it.

-- Option 1: Check if RLS is actually enabled (it should be)
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('users', 'companies', 'employees', 'payroll_runs');

-- Option 2: View current policies
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'users';

-- Option 3: Add a policy for service_role if needed (usually not required)
-- The service_role JWT should automatically bypass RLS

-- Verify your service role key is correct by checking this:
-- In Supabase Dashboard > Settings > API > service_role key

-- If you need to temporarily disable RLS for testing:
-- ALTER TABLE users DISABLE ROW LEVEL SECURITY;
-- (Remember to re-enable it: ALTER TABLE users ENABLE ROW LEVEL SECURITY;)
