import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    // Get user profile with company and employee info
    const { data: profile, error } = await supabase
      .from("users")
      .select("*, companies(*), employees(id, is_line_manager, first_name, last_name)")
      .eq("id", user.id)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Check if employees is an array
    const debugInfo = {
      authUserId: user.id,
      authUserEmail: user.email,
      profileRole: profile?.role,
      profileEmployeeId: profile?.employee_id,
      employeesIsArray: Array.isArray(profile?.employees),
      employeesLength: Array.isArray(profile?.employees) ? profile.employees.length : 'not an array',
      employeesData: profile?.employees,
      fullProfile: profile,
    }

    return NextResponse.json(debugInfo, { status: 200 })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
