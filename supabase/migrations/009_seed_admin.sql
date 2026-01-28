-- Seed test users with different roles
-- This creates/updates multiple test users for testing role-based access control

DO $$
DECLARE
  v_company_id UUID;
  v_department_id UUID;
  v_user_id UUID;
  v_employee_id UUID;
  v_user_record RECORD;
BEGIN
  -- Get or create company
  SELECT id INTO v_company_id FROM companies LIMIT 1;
  
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'No company found. Please create a company first.';
  END IF;

  -- Get or create a department
  SELECT id INTO v_department_id FROM departments WHERE company_id = v_company_id LIMIT 1;
  
  IF v_department_id IS NULL THEN
    INSERT INTO departments (company_id, name)
    VALUES (v_company_id, 'General')
    RETURNING id INTO v_department_id;
  END IF;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'Setting up test users with roles';
  RAISE NOTICE 'Company ID: %', v_company_id;
  RAISE NOTICE 'Department ID: %', v_department_id;
  RAISE NOTICE '========================================';

  -- Define test users with their roles
  FOR v_user_record IN 
    SELECT * FROM (VALUES
      ('admin@test.com', 'admin', 'Admin', 'User', 'ADMIN-001', 'System Administrator', true),
      ('hr@test.com', 'hr', 'HR', 'Manager', 'HR-001', 'HR Manager', false),
      ('finance@test.com', 'finance', 'Finance', 'Officer', 'FIN-001', 'Finance Officer', false),
      ('management@test.com', 'management', 'Management', 'Executive', 'MGT-001', 'Senior Manager', true),
      ('employee@test.com', 'employee', 'Regular', 'Employee', 'EMP-001', 'Staff Member', false)
    ) AS t(email, role, first_name, last_name, emp_number, position, is_line_manager)
  LOOP
    -- Check if user exists
    SELECT id, employee_id INTO v_user_id, v_employee_id
    FROM users
    WHERE email = v_user_record.email;

    IF v_user_id IS NULL THEN
      RAISE NOTICE 'User % not found - they need to register first', v_user_record.email;
      CONTINUE;
    END IF;

    -- Update user role
    UPDATE users
    SET role = v_user_record.role,
        company_id = v_company_id
    WHERE id = v_user_id;

    -- Create or update employee record
    IF v_employee_id IS NULL THEN
      -- Create new employee record
      INSERT INTO employees (
        company_id,
        department_id,
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
        v_department_id,
        v_user_record.emp_number,
        v_user_record.first_name,
        v_user_record.last_name,
        v_user_record.email,
        v_user_record.position,
        'active',
        'full_time',
        CURRENT_DATE,
        v_user_record.is_line_manager
      )
      RETURNING id INTO v_employee_id;

      -- Link employee to user
      UPDATE users
      SET employee_id = v_employee_id
      WHERE id = v_user_id;

      RAISE NOTICE '✓ Created % with role: % (Employee: %)', v_user_record.email, v_user_record.role, v_employee_id;
    ELSE
      -- Update existing employee record
      UPDATE employees
      SET first_name = v_user_record.first_name,
          last_name = v_user_record.last_name,
          position = v_user_record.position,
          is_line_manager = v_user_record.is_line_manager,
          company_id = v_company_id,
          department_id = v_department_id
      WHERE id = v_employee_id;

      RAISE NOTICE '✓ Updated % to role: % (Employee: %)', v_user_record.email, v_user_record.role, v_employee_id;
    END IF;
  END LOOP;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'Test users setup complete!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Test Credentials (all use same password from registration):';
  RAISE NOTICE '  admin@test.com       - Full system access';
  RAISE NOTICE '  hr@test.com          - HR management access';
  RAISE NOTICE '  finance@test.com     - Payroll & financial access';
  RAISE NOTICE '  management@test.com  - Reports & oversight access';
  RAISE NOTICE '  employee@test.com    - Basic employee access';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'IMPORTANT: All users must log out and log back in for role changes to take effect';
  RAISE NOTICE '========================================';

END $$;

SELECT '009 Test users with roles seeded successfully' as status;
