-- Bootstrap / promote a platform admin for a specific company
--
-- Why this exists:
-- - The app uses RLS and role-based access from public.users.role
-- - Creating the *first* admin can be hard if nobody can access Settings > Users yet
--
-- How to use (Supabase Dashboard > SQL Editor):
-- 1) Find the auth user id (UUID) of the person you want to promote (auth.users).
-- 2) Ensure they have a row in public.users (should be created by the 005 trigger).
-- 3) Replace the two UUID values below (v_user_id, v_company_id), then run.
--
-- Security note:
-- This is intended to be run manually by an operator in the Supabase dashboard.
-- It does NOT grant cross-company access; admin is still scoped to their company_id.

DO $$
DECLARE
    -- Replace these values:
    --   v_user_id:    auth.users.id (UUID)
    --   v_company_id: companies.id  (UUID)
    v_user_id UUID := '00000000-0000-0000-0000-000000000000';
    v_company_id UUID := '00000000-0000-0000-0000-000000000000';
BEGIN
    -- Basic guardrails
    IF v_user_id = '00000000-0000-0000-0000-000000000000' THEN
        RAISE EXCEPTION 'Set v_user_id to the target auth.users.id before running.';
    END IF;

    IF v_company_id = '00000000-0000-0000-0000-000000000000' THEN
        RAISE EXCEPTION 'Set v_company_id to the target companies.id before running.';
    END IF;

    -- Promote existing user to admin and ensure company_id is set
    UPDATE public.users
    SET role = 'admin',
            company_id = COALESCE(company_id, v_company_id)
    WHERE id = v_user_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'No row found in public.users for id=% (ensure the user has signed up / trigger ran).', v_user_id;
    END IF;
END $$;

SELECT '007 admin bootstrap completed' as status;
