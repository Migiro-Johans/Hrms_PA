-- Fix infinite recursion in users table RLS policies
-- The issue: policies were querying the users table from within users table policies

-- Drop all existing users policies to start fresh
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users can insert own profile" ON users;
DROP POLICY IF EXISTS "Admins can view company users" ON users;
DROP POLICY IF EXISTS "Admins can update company users" ON users;
DROP POLICY IF EXISTS "Admins can manage company users" ON users;
DROP POLICY IF EXISTS "Admin can manage all users" ON users;

-- Simple, safe policies that don't cause recursion
-- Users can always view and update their own profile
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT 
  USING (id = auth.uid());

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE 
  USING (id = auth.uid());

CREATE POLICY "Users can insert own profile" ON users
  FOR INSERT 
  WITH CHECK (id = auth.uid());

-- For admin/HR to view other users, we need to avoid recursion
-- Solution: Use a function that caches the current user's role
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.current_user_company()
RETURNS UUID
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT company_id FROM public.users WHERE id = auth.uid();
$$;

-- Admin and HR can view all users in their company
CREATE POLICY "Admins can view company users" ON users
  FOR SELECT 
  USING (
    company_id = current_user_company()
    AND current_user_role() IN ('admin', 'hr')
  );

-- Admin can update all users in their company
CREATE POLICY "Admin can update company users" ON users
  FOR UPDATE 
  USING (
    company_id = current_user_company()
    AND current_user_role() = 'admin'
  );

-- Admin can delete users in their company
CREATE POLICY "Admin can delete company users" ON users
  FOR DELETE 
  USING (
    company_id = current_user_company()
    AND current_user_role() = 'admin'
  );

SELECT '010 Users RLS policies fixed - no more infinite recursion' as status;
