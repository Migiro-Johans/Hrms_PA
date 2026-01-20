import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { renderToBuffer } from "@react-pdf/renderer"
import { P9PDF } from "@/components/p9-pdf"

export async function GET(
  request: NextRequest,
  { params }: { params: { employeeId: string } }
) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const year = parseInt(searchParams.get("year") || new Date().getFullYear().toString())

    // Get employee details
    const { data: employee, error: empError } = await supabase
      .from("employees")
      .select(`
        *,
        companies(name, kra_pin)
      `)
      .eq("id", params.employeeId)
      .single()

    if (empError || !employee) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 }
      )
    }

    // Get P9 records for the year
    const { data: p9Records, error: p9Error } = await supabase
      .from("p9_records")
      .select("*")
      .eq("employee_id", params.employeeId)
      .eq("year", year)
      .order("month")

    if (p9Error) {
      return NextResponse.json(
        { error: "Failed to fetch P9 records" },
        { status: 500 }
      )
    }

    const buffer = await renderToBuffer(
      P9PDF({
        employee,
        p9Records: p9Records || [],
        year,
        company: employee.companies,
      })
    )

    const filename = `P9_${employee.staff_id}_${year}.pdf`

    return new NextResponse(buffer as any, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error("P9 PDF generation error:", error)
    return NextResponse.json(
      { error: "Failed to generate P9 PDF" },
      { status: 500 }
    )
  }
}
