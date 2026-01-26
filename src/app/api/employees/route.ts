import { createClient } from "@/lib/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"

// Generate a secure random password
function generatePassword(length: number = 12): string {
  const uppercase = "ABCDEFGHJKLMNPQRSTUVWXYZ"
  const lowercase = "abcdefghjkmnpqrstuvwxyz"
  const numbers = "23456789"
  const special = "!@#$%&*"

  const allChars = uppercase + lowercase + numbers + special

  // Ensure at least one of each type
  let password = ""
  password += uppercase[Math.floor(Math.random() * uppercase.length)]
  password += lowercase[Math.floor(Math.random() * lowercase.length)]
  password += numbers[Math.floor(Math.random() * numbers.length)]
  password += special[Math.floor(Math.random() * special.length)]

  // Fill the rest randomly
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)]
  }

  // Shuffle the password
  return password.split("").sort(() => Math.random() - 0.5).join("")
}

// POST - Create a new employee with optional user account
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Verify the current user is admin or HR
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from("users")
      .select("role, company_id")
      .eq("id", user.id)
      .single()

    if (!profile?.company_id) {
      return NextResponse.json({ error: "Company not found" }, { status: 400 })
    }

    if (!["admin", "hr"].includes(profile.role)) {
      return NextResponse.json({ error: "Only admin or HR can create employees" }, { status: 403 })
    }

    const body = await request.json()
    const {
      // Employee fields
      staff_id,
      first_name,
      last_name,
      middle_name,
      gender,
      email,
      phone,
      employment_date,
      job_role,
      kra_pin,
      nssf_number,
      nhif_number,
      bank_name,
      account_number,
      department_id,
      pay_grade_id,
      // Salary fields
      basic_salary,
      car_allowance,
      meal_allowance,
      telephone_allowance,
      housing_allowance,
      // User account option
      create_user_account,
    } = body

    // Validate required fields
    if (!staff_id || !first_name || !last_name || !employment_date) {
      return NextResponse.json(
        { error: "Staff ID, first name, last name, and employment date are required" },
        { status: 400 }
      )
    }

    // Department is required - every employee must belong to a department
    if (!department_id) {
      return NextResponse.json(
        { error: "Department is required. Every employee must be assigned to a department." },
        { status: 400 }
      )
    }

    // If creating user account, email is required
    if (create_user_account && !email) {
      return NextResponse.json(
        { error: "Email is required when creating a user account" },
        { status: 400 }
      )
    }

    // Use service role client for admin operations
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    // Check if staff_id already exists in this company
    const { data: existingEmployee } = await supabaseAdmin
      .from("employees")
      .select("id")
      .eq("company_id", profile.company_id)
      .eq("staff_id", staff_id)
      .single()

    if (existingEmployee) {
      return NextResponse.json(
        { error: `An employee with staff ID "${staff_id}" already exists` },
        { status: 400 }
      )
    }

    // If creating user account, check if email already exists
    if (create_user_account && email) {
      const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers()
      const emailExists = existingUser.users.some(u => u.email?.toLowerCase() === email.toLowerCase())

      if (emailExists) {
        return NextResponse.json(
          { error: `A user with email "${email}" already exists` },
          { status: 400 }
        )
      }
    }

    // Create employee
    const { data: employee, error: employeeError } = await supabaseAdmin
      .from("employees")
      .insert({
        company_id: profile.company_id,
        staff_id,
        first_name,
        last_name,
        middle_name: middle_name || null,
        gender: gender || null,
        email: email || null,
        phone: phone || null,
        employment_date,
        job_role: job_role || null,
        kra_pin: kra_pin || null,
        nssf_number: nssf_number || null,
        nhif_number: nhif_number || null,
        bank_name: bank_name || null,
        account_number: account_number || null,
        department_id: department_id || null,
        pay_grade_id: pay_grade_id || null,
        status: "active",
      })
      .select()
      .single()

    if (employeeError) {
      return NextResponse.json({ error: employeeError.message }, { status: 400 })
    }

    // Create salary structure if basic_salary is provided
    if (employee && basic_salary) {
      await supabaseAdmin
        .from("salary_structures")
        .insert({
          employee_id: employee.id,
          basic_salary: parseFloat(basic_salary) || 0,
          car_allowance: parseFloat(car_allowance) || 0,
          meal_allowance: parseFloat(meal_allowance) || 0,
          telephone_allowance: parseFloat(telephone_allowance) || 0,
          housing_allowance: parseFloat(housing_allowance) || 0,
          effective_date: employment_date,
        })
    }

    // Create user account if requested
    let userCredentials = null
    if (create_user_account && email) {
      const generatedPassword = generatePassword()

      // Create auth user
      const { data: newAuthUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: generatedPassword,
        email_confirm: true,
      })

      if (authError) {
        // Employee was created but user account failed - log warning but don't fail
        console.error("Failed to create user account:", authError)
        return NextResponse.json({
          success: true,
          employee,
          user_account_error: authError.message,
          warning: "Employee created but user account creation failed",
        })
      }

      if (newAuthUser.user) {
        // Create user profile in public.users table
        const { error: profileError } = await supabaseAdmin
          .from("users")
          .insert({
            id: newAuthUser.user.id,
            email: email,
            company_id: profile.company_id,
            role: "employee",
            employee_id: employee.id,
          })

        if (profileError) {
          // Rollback: delete the auth user if profile creation fails
          await supabaseAdmin.auth.admin.deleteUser(newAuthUser.user.id)
          console.error("Failed to create user profile:", profileError)
          return NextResponse.json({
            success: true,
            employee,
            user_account_error: profileError.message,
            warning: "Employee created but user profile creation failed",
          })
        }

        userCredentials = {
          email,
          temporary_password: generatedPassword,
          user_id: newAuthUser.user.id,
        }

        // Log audit event for user creation
        await supabaseAdmin.from("audit_logs").insert({
          company_id: profile.company_id,
          user_id: user.id,
          action: "INSERT",
          table_name: "users",
          record_id: newAuthUser.user.id,
          new_values: { email, role: "employee", employee_id: employee.id },
          is_critical: false,
        })
      }
    }

    // Log audit event for employee creation
    await supabaseAdmin.from("audit_logs").insert({
      company_id: profile.company_id,
      user_id: user.id,
      action: "INSERT",
      table_name: "employees",
      record_id: employee.id,
      new_values: { staff_id, first_name, last_name, email },
      is_critical: false,
    })

    return NextResponse.json({
      success: true,
      employee,
      user_credentials: userCredentials,
    })
  } catch (error) {
    console.error("Error creating employee:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create employee" },
      { status: 500 }
    )
  }
}
