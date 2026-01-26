import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { formatCurrency, getMonthName } from "@/lib/utils"
import { Eye, Download } from "lucide-react"

export default async function PayslipsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from("users")
    .select("company_id, role, employee_id")
    .eq("id", user?.id)
    .single()

  // Determine if user can see all payslips (admin, hr, finance, management roles)
  const canSeeAllPayslips = ["admin", "hr", "finance", "management"].includes(profile?.role || "")

  // For regular employees, show only their own payslips
  // For admin/hr/finance/management, show all payslips in the company
  let query = supabase
    .from("payslips")
    .select(`
      *,
      employees:employee_id(first_name, last_name, staff_id),
      payroll_runs:payroll_run_id(month, year, status)
    `)
    .order("created_at", { ascending: false })

  if (!canSeeAllPayslips && profile?.employee_id) {
    // Regular employees only see their own payslips
    query = query.eq("employee_id", profile.employee_id)
  } else if (canSeeAllPayslips && profile?.company_id) {
    // Admin/HR/Finance/Management see all payslips in their company
    // Need to filter by company through the employees table
    const { data: companyEmployees } = await supabase
      .from("employees")
      .select("id")
      .eq("company_id", profile.company_id)

    if (companyEmployees && companyEmployees.length > 0) {
      const employeeIds = companyEmployees.map(e => e.id)
      query = query.in("employee_id", employeeIds)
    }
  } else if (!canSeeAllPayslips && !profile?.employee_id) {
    // User has no employee_id and is not admin - show nothing
    query = query.eq("employee_id", "00000000-0000-0000-0000-000000000000")
  }

  const { data: payslips } = await query

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {canSeeAllPayslips ? "All Payslips" : "My Payslips"}
        </h1>
        <p className="text-muted-foreground">
          View and download payslip documents
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payslip History</CardTitle>
          <CardDescription>
            {payslips?.length || 0} payslips found
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                {canSeeAllPayslips && <TableHead>Employee</TableHead>}
                <TableHead>Period</TableHead>
                <TableHead className="text-right">Gross Pay</TableHead>
                <TableHead className="text-right">Deductions</TableHead>
                <TableHead className="text-right">Net Pay</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payslips?.map((payslip) => (
                <TableRow key={payslip.id}>
                  {canSeeAllPayslips && (
                    <TableCell>
                      <div>
                        <p className="font-medium">
                          {payslip.employees?.first_name} {payslip.employees?.last_name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {payslip.employees?.staff_id}
                        </p>
                      </div>
                    </TableCell>
                  )}
                  <TableCell>
                    {getMonthName(payslip.payroll_runs?.month || 1)} {payslip.payroll_runs?.year}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(payslip.gross_pay)}
                  </TableCell>
                  <TableCell className="text-right text-red-600">
                    ({formatCurrency(payslip.total_deductions)})
                  </TableCell>
                  <TableCell className="text-right font-semibold text-green-600">
                    {formatCurrency(payslip.net_pay)}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                        payslip.payroll_runs?.status === "paid"
                          ? "bg-green-100 text-green-700"
                          : payslip.payroll_runs?.status === "approved"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {payslip.payroll_runs?.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Link href={`/payslips/${payslip.id}`}>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                      {/* Only show download for approved/paid payslips, or for admin/hr/finance roles */}
                      {(["approved", "paid"].includes(payslip.payroll_runs?.status) ||
                        ["admin", "hr", "finance"].includes(profile?.role || "")) && (
                        <Link href={`/api/payslips/${payslip.id}/pdf`} target="_blank">
                          <Button variant="ghost" size="sm">
                            <Download className="h-4 w-4" />
                          </Button>
                        </Link>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {(!payslips || payslips.length === 0) && (
                <TableRow>
                  <TableCell colSpan={canSeeAllPayslips ? 7 : 6} className="text-center py-8">
                    <p className="text-muted-foreground">No payslips found</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
