import { createClient } from "@/lib/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"

// POST - Create a new user (admin only)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Verify the current user is admin
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from("users")
      .select("role, company_id")
      .eq("id", user.id)
      .single()

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Only admins can create users" }, { status: 403 })
    }

    const body = await request.json()
    const { email, password, role, employee_id } = body

    if (!email || !password || !role) {
      return NextResponse.json(
        { error: "Email, password, and role are required" },
        { status: 400 }
      )
    }

    // Enforce that every user must be linked to an employee
    if (!employee_id) {
      return NextResponse.json(
        { error: "Employee selection is required. All users must be linked to an employee record." },
        { status: 400 }
      )
    }

    // Use service role client to create users
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

    // Create auth user
    const { data: newAuthUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
    })

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    if (!newAuthUser.user) {
      return NextResponse.json({ error: "Failed to create user" }, { status: 500 })
    }

    // Create user profile in public.users table
    const { error: profileError } = await supabaseAdmin
      .from("users")
      .insert({
        id: newAuthUser.user.id,
        email: email,
        company_id: profile.company_id,
        role: role,
        employee_id: employee_id || null,
      })

    if (profileError) {
      // Rollback: delete the auth user if profile creation fails
      await supabaseAdmin.auth.admin.deleteUser(newAuthUser.user.id)
      return NextResponse.json({ error: profileError.message }, { status: 400 })
    }

    // If employee_id provided, update the employee's email if not set
    if (employee_id) {
      const { data: employee } = await supabaseAdmin
        .from("employees")
        .select("email")
        .eq("id", employee_id)
        .single()

      if (employee && !employee.email) {
        await supabaseAdmin
          .from("employees")
          .update({ email })
          .eq("id", employee_id)
      }
    }

    // Log audit event
    await supabaseAdmin.from("audit_logs").insert({
      company_id: profile.company_id,
      user_id: user.id,
      action: "INSERT",
      table_name: "users",
      record_id: newAuthUser.user.id,
      new_values: { email, role, employee_id },
      is_critical: false,
    })

    return NextResponse.json({
      success: true,
      user: {
        id: newAuthUser.user.id,
        email: email,
        role: role,
      },
    })
  } catch (error) {
    console.error("Error creating user:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create user" },
      { status: 500 }
    )
  }
}

// GET - Get employees without user accounts (for linking)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from("users")
      .select("role, company_id")
      .eq("id", user.id)
      .single()

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Only admins can access this" }, { status: 403 })
    }

    // Get employees that don't have a user account
    const { data: existingUserEmployeeIds } = await supabase
      .from("users")
      .select("employee_id")
      .eq("company_id", profile.company_id)
      .not("employee_id", "is", null)

    const linkedEmployeeIds = existingUserEmployeeIds?.map(u => u.employee_id) || []

    let query = supabase
      .from("employees")
      .select("id, staff_id, first_name, last_name, email, job_role")
      .eq("company_id", profile.company_id)
      .eq("status", "active")
      .order("first_name")

    if (linkedEmployeeIds.length > 0) {
      query = query.not("id", "in", `(${linkedEmployeeIds.join(",")})`)
    }

    const { data: employees, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ employees })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch employees" },
      { status: 500 }
    )
  }
}
