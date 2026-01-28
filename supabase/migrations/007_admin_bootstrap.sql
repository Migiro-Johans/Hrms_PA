-- Bootstrap / promote a platform admin for a specific company
--
-- Why this exists:
-- - The app uses RLS and role-based access from public.users.role
-- - Creating the *first* admin can be hard if nobody can access Settings > Users yet
--
-- How to use (Supabase Dashboard > SQL Editor):
-- 1) Find the auth user id (UUID) of the person you want to promote (auth.users).
-- 2) Ensure they have a row in public.users (should be created by the 005 trigger).
-- 3) Run this script and replace :user_id and :company_id.
--
-- Security note:
-- This is intended to be run manually by an operator in the Supabase dashboard.
-- It does NOT grant cross-company access; admin is still scoped to their company_id.

BEGIN;

-- Promote existing user to admin and ensure company_id is set
UPDATE public.users
SET role = 'admin',
    company_id = COALESCE(company_id, :company_id)
WHERE id = :user_id;

-- (Optional) If you want to hard-set the company explicitly even if it exists, use:
-- UPDATE public.users SET role='admin', company_id=:company_id WHERE id=:user_id;

COMMIT;

SELECT '007 admin bootstrap completed' as status;
