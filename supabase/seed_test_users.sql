-- Seed Test Users for Different Roles
-- Run this in Supabase SQL Editor
--
-- IMPORTANT: After running this SQL, you need to create the auth users manually
-- in Supabase Dashboard > Authentication > Users, or use the Admin API.
--
-- This script assumes you already have:
-- 1. A company created
-- 2. Some employees in the system
--
-- Password for all test users: Test123!

-- First, let's see existing company and employees
-- SELECT id, name FROM companies LIMIT 1;
-- SELECT id, first_name, last_name, staff_id FROM employees WHERE status = 'active' LIMIT 10;

-- ===========================================
-- OPTION 1: If you want to use Supabase Admin API (recommended)
-- ===========================================
-- Use the Supabase Dashboard: Authentication > Users > Add user
-- Then link them using the SQL below

-- ===========================================
-- OPTION 2: Direct SQL insertion (for testing)
-- ===========================================

-- Get the company_id (assumes single company setup)
DO $$
DECLARE
    v_company_id UUID;
    v_admin_id UUID := gen_random_uuid();
    v_hr_id UUID := gen_random_uuid();
    v_finance_id UUID := gen_random_uuid();
    v_management_id UUID := gen_random_uuid();
    v_employee_id UUID := gen_random_uuid();
    v_emp_record_id UUID;
BEGIN
    -- Get first company
    SELECT id INTO v_company_id FROM companies LIMIT 1;

    IF v_company_id IS NULL THEN
        RAISE EXCEPTION 'No company found. Please create a company first.';
    END IF;

    RAISE NOTICE 'Using company_id: %', v_company_id;

    -- Get an employee to link (optional - for employee role)
    SELECT id INTO v_emp_record_id FROM employees WHERE company_id = v_company_id AND status = 'active' LIMIT 1;

    -- Note: The auth.users entries must be created via Supabase Auth API or Dashboard
    -- The UUIDs below are placeholders - replace them with actual auth user IDs after creating users

    RAISE NOTICE 'Test user UUIDs generated:';
    RAISE NOTICE 'Admin: %', v_admin_id;
    RAISE NOTICE 'HR: %', v_hr_id;
    RAISE NOTICE 'Finance: %', v_finance_id;
    RAISE NOTICE 'Management: %', v_management_id;
    RAISE NOTICE 'Employee: %', v_employee_id;
    RAISE NOTICE 'Employee record to link: %', v_emp_record_id;

END $$;

-- ===========================================
-- Manual Steps After Running This:
-- ===========================================
--
-- 1. Go to Supabase Dashboard > Authentication > Users
-- 2. Click "Add user" for each role:
--
--    Email: admin@test.com      | Password: Test123! | Role will be: admin
--    Email: hr@test.com         | Password: Test123! | Role will be: hr
--    Email: finance@test.com    | Password: Test123! | Role will be: finance
--    Email: management@test.com | Password: Test123! | Role will be: management
--    Email: employee@test.com   | Password: Test123! | Role will be: employee
--
-- 3. After creating each user, copy their UUID from the Supabase Users table
-- 4. Run the INSERT statements below with the correct UUIDs

-- ===========================================
-- Template INSERT Statements (update UUIDs)
-- ===========================================

-- Replace 'YOUR_COMPANY_ID' with your actual company UUID
-- Replace each 'AUTH_USER_UUID_*' with the UUID from Supabase Auth

/*
-- Get your company ID first:
SELECT id, name FROM companies;

-- Then insert users (replace the UUIDs):

INSERT INTO users (id, email, company_id, role, employee_id) VALUES
('AUTH_USER_UUID_ADMIN', 'admin@test.com', 'YOUR_COMPANY_ID', 'admin', NULL),
('AUTH_USER_UUID_HR', 'hr@test.com', 'YOUR_COMPANY_ID', 'hr', NULL),
('AUTH_USER_UUID_FINANCE', 'finance@test.com', 'YOUR_COMPANY_ID', 'finance', NULL),
('AUTH_USER_UUID_MANAGEMENT', 'management@test.com', 'YOUR_COMPANY_ID', 'management', NULL),
('AUTH_USER_UUID_EMPLOYEE', 'employee@test.com', 'YOUR_COMPANY_ID', 'employee', 'EMPLOYEE_RECORD_UUID')
ON CONFLICT (id) DO UPDATE SET
    role = EXCLUDED.role,
    employee_id = EXCLUDED.employee_id;
*/

-- ===========================================
-- Quick Check Queries
-- ===========================================

-- View all users and their roles:
-- SELECT u.email, u.role, e.first_name, e.last_name, e.staff_id
-- FROM users u
-- LEFT JOIN employees e ON u.employee_id = e.id
-- ORDER BY u.role;

-- View company info:
-- SELECT id, name FROM companies;

-- View available employees to link:
-- SELECT e.id, e.first_name, e.last_name, e.staff_id
-- FROM employees e
-- LEFT JOIN users u ON e.id = u.employee_id
-- WHERE u.id IS NULL AND e.status = 'active';
