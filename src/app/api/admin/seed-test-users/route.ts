import { createClient } from "@/lib/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"

// Test users configuration
const TEST_USERS = [
  { email: "admin@test.com", role: "admin", password: "Test123!" },
  { email: "hr@test.com", role: "hr", password: "Test123!" },
  { email: "finance@test.com", role: "finance", password: "Test123!" },
  { email: "management@test.com", role: "management", password: "Test123!" },
  { email: "employee@test.com", role: "employee", password: "Test123!" },
]

// POST - Create test users for all roles (admin only)
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
      return NextResponse.json({ error: "Only admins can seed test users" }, { status: 403 })
    }

    // Use service role client
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

    const results: { email: string; role: string; status: string; error?: string }[] = []

    // Get an employee to link to the employee user
    const { data: availableEmployee } = await supabaseAdmin
      .from("employees")
      .select("id")
      .eq("company_id", profile.company_id)
      .eq("status", "active")
      .limit(1)
      .single()

    for (const testUser of TEST_USERS) {
      try {
        // Check if user already exists
        const { data: existingUser } = await supabaseAdmin
          .from("users")
          .select("id, email")
          .eq("email", testUser.email)
          .single()

        if (existingUser) {
          results.push({
            email: testUser.email,
            role: testUser.role,
            status: "skipped",
            error: "User already exists",
          })
          continue
        }

        // Create auth user
        const { data: newAuthUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: testUser.email,
          password: testUser.password,
          email_confirm: true,
        })

        if (authError) {
          results.push({
            email: testUser.email,
            role: testUser.role,
            status: "failed",
            error: authError.message,
          })
          continue
        }

        if (!newAuthUser.user) {
          results.push({
            email: testUser.email,
            role: testUser.role,
            status: "failed",
            error: "Failed to create auth user",
          })
          continue
        }

        // Determine employee_id (only for employee role)
        const employeeId = testUser.role === "employee" && availableEmployee
          ? availableEmployee.id
          : null

        // Create user profile
        const { error: profileError } = await supabaseAdmin
          .from("users")
          .insert({
            id: newAuthUser.user.id,
            email: testUser.email,
            company_id: profile.company_id,
            role: testUser.role,
            employee_id: employeeId,
          })

        if (profileError) {
          // Rollback: delete auth user
          await supabaseAdmin.auth.admin.deleteUser(newAuthUser.user.id)
          results.push({
            email: testUser.email,
            role: testUser.role,
            status: "failed",
            error: profileError.message,
          })
          continue
        }

        results.push({
          email: testUser.email,
          role: testUser.role,
          status: "created",
        })
      } catch (err) {
        results.push({
          email: testUser.email,
          role: testUser.role,
          status: "failed",
          error: err instanceof Error ? err.message : "Unknown error",
        })
      }
    }

    // Log audit event
    await supabaseAdmin.from("audit_logs").insert({
      company_id: profile.company_id,
      user_id: user.id,
      action: "INSERT",
      table_name: "users",
      record_id: "bulk_test_users",
      new_values: { test_users: results },
      is_critical: false,
    })

    return NextResponse.json({
      success: true,
      message: "Test users seeding completed",
      results,
      credentials: TEST_USERS.map(u => ({ email: u.email, password: u.password, role: u.role })),
    })
  } catch (error) {
    console.error("Error seeding test users:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to seed test users" },
      { status: 500 }
    )
  }
}

// GET - Check which test users exist
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

    // Check existing test users
    const { data: existingUsers } = await supabase
      .from("users")
      .select("email, role")
      .eq("company_id", profile.company_id)
      .in("email", TEST_USERS.map(u => u.email))

    const existing = existingUsers || []
    const existingEmails = existing.map(u => u.email)
    const missing = TEST_USERS.filter(u => !existingEmails.includes(u.email))

    return NextResponse.json({
      existing,
      missing: missing.map(u => ({ email: u.email, role: u.role })),
      allTestUsers: TEST_USERS.map(u => ({ email: u.email, role: u.role, password: u.password })),
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to check test users" },
      { status: 500 }
    )
  }
}
