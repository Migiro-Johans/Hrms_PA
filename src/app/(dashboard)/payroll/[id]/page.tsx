import Link from "next/link"
import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { PayrollStatusBadge } from "@/components/payroll-status-badge"
import { ApprovalTimeline } from "@/components/approval-timeline"
import { formatCurrency, getMonthName } from "@/lib/utils"
import { ArrowLeft, Download, CheckCircle, DollarSign, XCircle } from "lucide-react"
import type { UserRole, PayrollStatus, PayrollRun } from "@/types"

interface PageProps {
  params: { id: string }
}

export default async function PayrollDetailPage({ params }: PageProps) {
  const supabase = await createClient()

  // Get user's role
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from("users")
    .select("company_id, role")
    .eq("id", user?.id)
    .single()

  const userRole = (profile?.role || "employee") as UserRole

  // Get payroll run with payslips
  const { data: payrollRun, error } = await supabase
    .from("payroll_runs")
    .select(`
      *,
      payslips(
        *,
        employees(id, first_name, last_name, staff_id, email, department_id, departments(name))
      )
    `)
    .eq("id", params.id)
    .eq("company_id", profile?.company_id)
    .single()

  if (error || !payrollRun) {
    notFound()
  }

  // Calculate totals
  const totals = payrollRun.payslips?.reduce(
    (acc: { gross: number; net: number; paye: number; nssf: number; shif: number; ahl: number }, p: { gross_pay: number; net_pay: number; paye: number; nssf_employee: number; shif_employee: number; ahl_employee: number }) => ({
      gross: acc.gross + (p.gross_pay || 0),
      net: acc.net + (p.net_pay || 0),
      paye: acc.paye + (p.paye || 0),
      nssf: acc.nssf + (p.nssf_employee || 0),
      shif: acc.shif + (p.shif_employee || 0),
      ahl: acc.ahl + (p.ahl_employee || 0),
    }),
    { gross: 0, net: 0, paye: 0, nssf: 0, shif: 0, ahl: 0 }
  ) || { gross: 0, net: 0, paye: 0, nssf: 0, shif: 0, ahl: 0 }

  // Determine user actions
  const canApproveAsHR = ["admin", "hr"].includes(userRole) && payrollRun.status === "hr_pending"
  const canApproveAsManagement = ["admin", "management"].includes(userRole) && payrollRun.status === "mgmt_pending"
  const canMarkAsPaid = ["admin", "finance"].includes(userRole) && payrollRun.status === "approved"
  const canResubmit = ["admin", "finance"].includes(userRole) && ["hr_rejected", "mgmt_rejected"].includes(payrollRun.status)
  const showApproveButton = canApproveAsHR || canApproveAsManagement

  const handleResubmit = async () => {
    const { createClient } = await import("@/lib/supabase/client")
    const supabase = createClient()

    // Resubmit rejected payroll -> goes back to hr_pending
    // We update the payroll status, but the workflow system should really handle this via a new request or step reset.
    // For now, we'll manually reset the status as the old version did, but ideally we'd use the workflow service.
    const { error } = await supabase
      .from("payroll_runs")
      .update({
        status: "hr_pending",
        rejection_comments: null,
      })
      .eq("id", params.id)

    if (error) {
      alert("Failed to resubmit payroll")
      return
    }

    window.location.reload()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/payroll">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {getMonthName(payrollRun.month)} {payrollRun.year} Payroll
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <PayrollStatusBadge status={payrollRun.status as PayrollStatus} />
              <span className="text-sm text-muted-foreground">
                {payrollRun.payslips?.length || 0} employees
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {showApproveButton && (
            <Link href={`/payroll/${params.id}/approve`}>
              <Button>
                <CheckCircle className="h-4 w-4 mr-2" />
                Review & Approve
              </Button>
            </Link>
          )}
          {canResubmit && (
            <Button onClick={handleResubmit}>
              Resubmit for Approval
            </Button>
          )}
          {canMarkAsPaid && (
            <Link href={`/payroll/${params.id}/approve`}>
              <Button variant="default" className="bg-green-600 hover:bg-green-700">
                <DollarSign className="h-4 w-4 mr-2" />
                Mark as Paid
              </Button>
            </Link>
          )}
        </div>
      </div>

      {["hr_rejected", "mgmt_rejected"].includes(payrollRun.status) && payrollRun.rejection_comments && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="font-medium text-red-800">Payroll was Rejected</p>
                <p className="text-sm text-red-600">
                  Reason: {payrollRun.rejection_comments}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        {/* Summary */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Payroll Summary</CardTitle>
            <CardDescription>Overview of payroll totals</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-muted-foreground">Total Gross</p>
                <p className="text-xl font-semibold">{formatCurrency(totals.gross)}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-muted-foreground">Total NSSF</p>
                <p className="text-xl font-semibold text-red-600">{formatCurrency(totals.nssf)}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-muted-foreground">Total SHIF</p>
                <p className="text-xl font-semibold text-red-600">{formatCurrency(totals.shif)}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-muted-foreground">Total AHL</p>
                <p className="text-xl font-semibold text-red-600">{formatCurrency(totals.ahl)}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-muted-foreground">Total PAYE</p>
                <p className="text-xl font-semibold text-red-600">{formatCurrency(totals.paye)}</p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-muted-foreground">Total Net Pay</p>
                <p className="text-xl font-semibold text-green-700">{formatCurrency(totals.net)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Approval Timeline */}
        <Card>
          <CardHeader>
            <CardTitle>Approval Status</CardTitle>
          </CardHeader>
          <CardContent>
            <ApprovalTimeline payrollRun={payrollRun as PayrollRun} />
          </CardContent>
        </Card>
      </div>

      {/* Payslips Table */}
      <Card>
        <CardHeader>
          <CardTitle>Employee Payslips</CardTitle>
          <CardDescription>
            Individual payroll breakdown for each employee
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead className="text-right">Gross Pay</TableHead>
                  <TableHead className="text-right">NSSF</TableHead>
                  <TableHead className="text-right">SHIF</TableHead>
                  <TableHead className="text-right">AHL</TableHead>
                  <TableHead className="text-right">PAYE</TableHead>
                  <TableHead className="text-right">Net Pay</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payrollRun.payslips?.map((payslip: {
                  id: string
                  gross_pay: number
                  nssf_employee: number
                  shif_employee: number
                  ahl_employee: number
                  paye: number
                  net_pay: number
                  employees: {
                    first_name: string
                    last_name: string
                    staff_id: string
                    departments?: { name: string }
                  }
                }) => (
                  <TableRow key={payslip.id}>
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
                    <TableCell>
                      {payslip.employees?.departments?.name || "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(payslip.gross_pay)}
                    </TableCell>
                    <TableCell className="text-right text-red-600">
                      ({formatCurrency(payslip.nssf_employee)})
                    </TableCell>
                    <TableCell className="text-right text-red-600">
                      ({formatCurrency(payslip.shif_employee)})
                    </TableCell>
                    <TableCell className="text-right text-red-600">
                      ({formatCurrency(payslip.ahl_employee)})
                    </TableCell>
                    <TableCell className="text-right text-red-600">
                      ({formatCurrency(payslip.paye)})
                    </TableCell>
                    <TableCell className="text-right font-semibold text-green-600">
                      {formatCurrency(payslip.net_pay)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/payslips/${payslip.id}`}>
                        <Button variant="ghost" size="sm">
                          <Download className="h-4 w-4" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
