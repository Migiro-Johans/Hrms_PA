import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { renderToBuffer } from "@react-pdf/renderer"
import { PayslipPDF } from "@/components/payslip-pdf"

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()

    // Get the current user's role
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { data: profile } = await supabase
      .from("users")
      .select("role, employee_id")
      .eq("id", user.id)
      .single()

    const { data: payslip, error } = await supabase
      .from("payslips")
      .select(`
        *,
        employees(
          first_name, last_name, middle_name, staff_id, job_role,
          bank_name, account_number, kra_pin, nssf_number, nhif_number,
          employment_date
        ),
        payroll_runs(month, year, status, companies(name, address, email, phone, logo_url))
      `)
      .eq("id", params.id)
      .single()

    if (error || !payslip) {
      return NextResponse.json(
        { error: "Payslip not found" },
        { status: 404 }
      )
    }

    // Check authorization for employees
    // Employees can only download their own payslips that are approved or paid
    const isAdminRole = ["admin", "hr", "finance", "management"].includes(profile?.role || "")
    const isOwnPayslip = profile?.employee_id === payslip.employee_id
    const isApproved = ["approved", "paid"].includes(payslip.payroll_runs?.status)

    if (!isAdminRole) {
      // For non-admin users (employees)
      if (!isOwnPayslip) {
        return NextResponse.json(
          { error: "You can only download your own payslips" },
          { status: 403 }
        )
      }

      if (!isApproved) {
        return NextResponse.json(
          { error: "Payslip is not yet approved for download. Please wait for HR approval." },
          { status: 403 }
        )
      }
    }

    const buffer = await renderToBuffer(PayslipPDF({ payslip }))

    const employee = payslip.employees
    const payrollRun = payslip.payroll_runs
    const filename = `payslip_${employee?.staff_id}_${payrollRun?.year}_${payrollRun?.month}.pdf`

    return new NextResponse(buffer as any, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error("PDF generation error:", error)
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 }
    )
  }
}
