import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = await createClient()

    // Step 1: Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError) {
      return NextResponse.json({
        step: "auth",
        error: authError.message,
        details: authError,
      }, { status: 401 })
    }

    if (!user) {
      return NextResponse.json({
        step: "auth",
        error: "No authenticated user",
      }, { status: 401 })
    }

    // Step 2: Get the user's profile
    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("*")
      .eq("id", user.id)
      .single()

    if (profileError) {
      return NextResponse.json({
        step: "profile",
        error: profileError.message,
        code: profileError.code,
        details: profileError,
        userId: user.id,
        userEmail: user.email,
      }, { status: 400 })
    }

    // Step 3: Get all employees (without company filter to see what exists)
    const { data: allEmployees, error: allEmployeesError } = await supabase
      .from("employees")
      .select("id, staff_id, first_name, last_name, company_id, status")

    // Step 4: Get employees filtered by company
    const { data: companyEmployees, error: companyEmployeesError } = await supabase
      .from("employees")
      .select(`
        *,
        departments(name),
        pay_grades(pay_group, pay_grade),
        salary_structures(basic_salary, car_allowance, meal_allowance, telephone_allowance)
      `)
      .eq("company_id", profile?.company_id)
      .order("staff_id")

    // Step 5: Get companies
    const { data: companies, error: companiesError } = await supabase
      .from("companies")
      .select("id, name")

    return NextResponse.json({
      success: true,
      debug: {
        step1_auth: {
          userId: user.id,
          email: user.email,
        },
        step2_profile: {
          profile,
        },
        step3_allEmployees: {
          count: allEmployees?.length || 0,
          employees: allEmployees,
          error: allEmployeesError ? allEmployeesError.message : null,
        },
        step4_companyEmployees: {
          companyId: profile?.company_id,
          count: companyEmployees?.length || 0,
          employees: companyEmployees,
          error: companyEmployeesError ? companyEmployeesError.message : null,
        },
        step5_companies: {
          count: companies?.length || 0,
          companies,
          error: companiesError ? companiesError.message : null,
        },
      },
    })
  } catch (error) {
    return NextResponse.json({
      error: "Unexpected error",
      details: error instanceof Error ? error.message : String(error),
    }, { status: 500 })
  }
}
