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
    v_user_id UUID := '89e5b6ea-2c36-4689-95a3-3ac27eb3bb2c';
    v_company_id UUID := 'c9d089fe-c1a1-4fb1-b49f-eb7c1392d583';
BEGIN
    -- Basic guardrails
    IF v_user_id = '00000000-0000-0000-0000-000000000000' THEN
        RAISE EXCEPTION 'Set v_user_id to the target auth.users.id before running.';
    END IF;

    IF v_company_id = '00000000-0000-0000-0000-000000000000' THEN
        RAISE EXCEPTION 'Set v_company_id to the target companies.id before running.';
    END IF;

    -- Ensure an employee record exists for this user
    DECLARE
        v_employee_id UUID;
        v_email TEXT;
    BEGIN
        -- Get user email
        SELECT email INTO v_email FROM auth.users WHERE id = v_user_id;
        
        IF v_email IS NULL THEN
            RAISE EXCEPTION 'No auth.users record found for id=%', v_user_id;
        END IF;

        -- Check if employee exists
        SELECT id INTO v_employee_id 
        FROM employees 
        WHERE company_id = v_company_id 
          AND (email = v_email OR id = (SELECT employee_id FROM public.users WHERE id = v_user_id))
        LIMIT 1;

        -- If no employee, create one
        IF v_employee_id IS NULL THEN
            INSERT INTO employees (
                company_id,
                staff_id,
                first_name,
                last_name,
                email,
                employment_date,
                status
            ) VALUES (
                v_company_id,
                'ADMIN-' || substring(v_user_id::text from 1 for 8),
                'Admin',
                'User',
                v_email,
                NOW(),
                'active'
            )
            RETURNING id INTO v_employee_id;
        END IF;

        -- Promote existing user to admin and link employee
        UPDATE public.users
        SET role = 'admin',
            company_id = v_company_id,
            employee_id = v_employee_id
        WHERE id = v_user_id;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'No row found in public.users for id=% (ensure the user has signed up / trigger ran).', v_user_id;
        END IF;
    END;
END $$;

SELECT '007 admin bootstrap completed' as status;
