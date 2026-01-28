-- Seed the first admin user
-- This promotes an existing user to admin role
-- IMPORTANT: Replace the email below with the actual email of the user you want to make admin

DO $$
DECLARE
  v_user_email TEXT := 'employee@test.com'; -- CHANGE THIS to your admin email
  v_user_id UUID;
  v_employee_id UUID;
  v_company_id UUID;
BEGIN
  -- Check if user exists
  SELECT id, employee_id, company_id
  INTO v_user_id, v_employee_id, v_company_id
  FROM users
  WHERE email = v_user_email;

  IF v_user_id IS NULL THEN
    RAISE NOTICE 'User with email % not found. Please register this user first.', v_user_email;
    RETURN;
  END IF;

  -- Check if already admin
  IF EXISTS (SELECT 1 FROM users WHERE id = v_user_id AND role = 'admin') THEN
    RAISE NOTICE 'User % is already an admin', v_user_email;
    RETURN;
  END IF;

  -- Update user to admin role
  UPDATE users
  SET role = 'admin'
  WHERE id = v_user_id;

  RAISE NOTICE 'Successfully promoted % to admin role', v_user_email;

  -- If user doesn't have an employee record, create one
  IF v_employee_id IS NULL THEN
    RAISE NOTICE 'User % does not have an employee record. Creating one...', v_user_email;

    -- Get company_id from users table
    IF v_company_id IS NULL THEN
      -- Get the first company (or you can specify one)
      SELECT id INTO v_company_id FROM companies LIMIT 1;
      
      IF v_company_id IS NULL THEN
        RAISE EXCEPTION 'No company found. Please create a company first.';
      END IF;

      -- Update user's company_id
      UPDATE users SET company_id = v_company_id WHERE id = v_user_id;
    END IF;

    -- Create employee record
    INSERT INTO employees (
      company_id,
      employee_number,
      first_name,
      last_name,
      email,
      position,
      employment_status,
      employment_type,
      date_of_joining,
      is_line_manager
    )
    VALUES (
      v_company_id,
      'ADMIN-001',
      'System',
      'Administrator',
      v_user_email,
      'System Administrator',
      'active',
      'full_time',
      CURRENT_DATE,
      true
    )
    RETURNING id INTO v_employee_id;

    -- Link employee to user
    UPDATE users
    SET employee_id = v_employee_id
    WHERE id = v_user_id;

    RAISE NOTICE 'Created employee record for admin user';
  END IF;

  RAISE NOTICE 'Admin setup complete for %', v_user_email;
  RAISE NOTICE 'User ID: %', v_user_id;
  RAISE NOTICE 'Employee ID: %', v_employee_id;
  RAISE NOTICE 'Company ID: %', v_company_id;
  RAISE NOTICE 'The user should log out and log back in for role changes to take effect.';

END $$;

SELECT '009 Admin user seeded successfully' as status;
