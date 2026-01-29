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
  TableFooter,
} from "@/components/ui/table"
import { PayrollStatusBadge } from "@/components/payroll-status-badge"
import { ApprovalTimeline } from "@/components/approval-timeline"
import { formatCurrency, getMonthName } from "@/lib/utils"
import { ArrowLeft, Download, CheckCircle, DollarSign, XCircle, Building2 } from "lucide-react"
import type { UserRole, PayrollStatus, PayrollRun } from "@/types"
import { PayrollCsvExport } from "@/components/payroll/payroll-csv-export"

interface PageProps {
  params: { id: string }
}

export default async function PayrollDetailPage({ params }: PageProps) {
  const supabase = await createClient()

  // Get user's role and company info
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from("users")
    .select("company_id, role, companies:company_id(name)")
    .eq("id", user?.id)
    .single()

  const userRole = (profile?.role || "employee") as UserRole
  const companyName = (profile?.companies as any)?.name || ""

  // Get payroll run with full payslip data
  const { data: payrollRun, error } = await supabase
    .from("payroll_runs")
    .select(`
      *,
      payslips(
        *,
        employees:employee_id(
          id, first_name, last_name, staff_id, email,
          kra_pin, nssf_number, nhif_number,
          bank_name, account_number,
          department_id, departments:department_id(name)
        )
      )
    `)
    .eq("id", params.id)
    .eq("company_id", profile?.company_id)
    .single()

  if (error || !payrollRun) {
    notFound()
  }

  // Calculate comprehensive totals
  const totals = payrollRun.payslips?.reduce(
    (acc: any, p: any) => ({
      // Earnings
      basic_salary: acc.basic_salary + (p.basic_salary || 0),
      car_allowance: acc.car_allowance + (p.car_allowance || 0),
      meal_allowance: acc.meal_allowance + (p.meal_allowance || 0),
      telephone_allowance: acc.telephone_allowance + (p.telephone_allowance || 0),
      housing_allowance: acc.housing_allowance + (p.housing_allowance || 0),
      gross_pay: acc.gross_pay + (p.gross_pay || 0),
      // Employee Deductions
      nssf_employee: acc.nssf_employee + (p.nssf_employee || 0),
      shif_employee: acc.shif_employee + (p.shif_employee || 0),
      ahl_employee: acc.ahl_employee + (p.ahl_employee || 0),
      paye: acc.paye + (p.paye || 0),
      helb: acc.helb + (p.helb || 0),
      total_deductions: acc.total_deductions + (p.total_deductions || 0),
      net_pay: acc.net_pay + (p.net_pay || 0),
      // Employer Contributions
      nssf_employer: acc.nssf_employer + (p.nssf_employer || 0),
      ahl_employer: acc.ahl_employer + (p.ahl_employer || 0),
      nita: acc.nita + (p.nita || 0),
      cost_to_company: acc.cost_to_company + (p.cost_to_company || 0),
    }),
    {
      basic_salary: 0,
      car_allowance: 0,
      meal_allowance: 0,
      telephone_allowance: 0,
      housing_allowance: 0,
      gross_pay: 0,
      nssf_employee: 0,
      shif_employee: 0,
      ahl_employee: 0,
      paye: 0,
      helb: 0,
      total_deductions: 0,
      net_pay: 0,
      nssf_employer: 0,
      ahl_employer: 0,
      nita: 0,
      cost_to_company: 0,
    }
  ) || {
    basic_salary: 0,
    car_allowance: 0,
    meal_allowance: 0,
    telephone_allowance: 0,
    housing_allowance: 0,
    gross_pay: 0,
    nssf_employee: 0,
    shif_employee: 0,
    ahl_employee: 0,
    paye: 0,
    helb: 0,
    total_deductions: 0,
    net_pay: 0,
    nssf_employer: 0,
    ahl_employer: 0,
    nita: 0,
    cost_to_company: 0,
  }

  // Determine user actions
  const canReconcileAsFinance = ["admin", "finance"].includes(userRole) && payrollRun.status === "finance_pending"
  const canApproveAsManagement = ["admin", "management"].includes(userRole) && payrollRun.status === "mgmt_pending"
  const canMarkAsPaid = ["admin", "finance"].includes(userRole) && payrollRun.status === "approved"
  const canResubmit = ["admin", "hr"].includes(userRole) && ["finance_rejected", "mgmt_rejected"].includes(payrollRun.status)
  const showApproveButton = canReconcileAsFinance || canApproveAsManagement

  const handleResubmit = async () => {
    const { createClient } = await import("@/lib/supabase/client")
    const supabase = createClient()

    const { error } = await supabase
      .from("payroll_runs")
      .update({
        status: "finance_pending",
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
          <PayrollCsvExport
            payslips={payrollRun.payslips || []}
            month={payrollRun.month}
            year={payrollRun.year}
            companyName={companyName}
          />
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

      {/* Payroll Summary Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Employee Deductions Summary */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Employee Deductions</CardTitle>
            <CardDescription>Total deductions from employees</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">NSSF (Employee)</span>
              <span className="font-medium text-red-600">{formatCurrency(totals.nssf_employee)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">SHIF (Employee)</span>
              <span className="font-medium text-red-600">{formatCurrency(totals.shif_employee)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">AHL (Employee)</span>
              <span className="font-medium text-red-600">{formatCurrency(totals.ahl_employee)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">PAYE</span>
              <span className="font-medium text-red-600">{formatCurrency(totals.paye)}</span>
            </div>
            {totals.helb > 0 && (
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">HELB</span>
                <span className="font-medium text-red-600">{formatCurrency(totals.helb)}</span>
              </div>
            )}
            <div className="border-t pt-3 flex justify-between">
              <span className="font-medium">Total Deductions</span>
              <span className="font-bold text-red-600">{formatCurrency(totals.total_deductions)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Employer Contributions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Employer Contributions
            </CardTitle>
            <CardDescription>Company statutory contributions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">NSSF (Employer)</span>
              <span className="font-medium text-orange-600">{formatCurrency(totals.nssf_employer)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">AHL (Employer)</span>
              <span className="font-medium text-orange-600">{formatCurrency(totals.ahl_employer)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">NITA</span>
              <span className="font-medium text-orange-600">{formatCurrency(totals.nita)}</span>
            </div>
            <div className="border-t pt-3 flex justify-between">
              <span className="font-medium">Total Employer Cost</span>
              <span className="font-bold text-orange-600">
                {formatCurrency(totals.nssf_employer + totals.ahl_employer + totals.nita)}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Overall Summary */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Payroll Summary</CardTitle>
            <CardDescription>Overall payroll totals</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Total Gross Pay</span>
              <span className="font-medium">{formatCurrency(totals.gross_pay)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Total Deductions</span>
              <span className="font-medium text-red-600">({formatCurrency(totals.total_deductions)})</span>
            </div>
            <div className="flex justify-between border-t pt-2">
              <span className="text-sm text-muted-foreground">Total Net Pay</span>
              <span className="font-bold text-green-600">{formatCurrency(totals.net_pay)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Employer Contributions</span>
              <span className="font-medium text-orange-600">
                {formatCurrency(totals.nssf_employer + totals.ahl_employer + totals.nita)}
              </span>
            </div>
            <div className="border-t pt-3 flex justify-between bg-blue-50 -mx-6 px-6 py-3 rounded-b-lg">
              <span className="font-bold">Total Cost to Company</span>
              <span className="font-bold text-blue-700">{formatCurrency(totals.cost_to_company)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Approval Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Approval Status</CardTitle>
        </CardHeader>
        <CardContent>
          <ApprovalTimeline payrollRun={payrollRun as PayrollRun} />
        </CardContent>
      </Card>

      {/* Detailed Payslips Table */}
      <Card>
        <CardHeader>
          <CardTitle>Employee Payroll Details</CardTitle>
          <CardDescription>
            Complete breakdown for each employee including all deductions and employer costs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="font-semibold">Employee</TableHead>
                  <TableHead className="font-semibold">Department</TableHead>
                  <TableHead className="text-right font-semibold">Gross Pay</TableHead>
                  <TableHead className="text-right font-semibold">NSSF (Emp)</TableHead>
                  <TableHead className="text-right font-semibold">SHIF</TableHead>
                  <TableHead className="text-right font-semibold">AHL (Emp)</TableHead>
                  <TableHead className="text-right font-semibold">PAYE</TableHead>
                  <TableHead className="text-right font-semibold">Net Pay</TableHead>
                  <TableHead className="text-right font-semibold">NSSF (Empr)</TableHead>
                  <TableHead className="text-right font-semibold">AHL (Empr)</TableHead>
                  <TableHead className="text-right font-semibold">NITA</TableHead>
                  <TableHead className="text-right font-semibold">Cost to Co.</TableHead>
                  <TableHead className="text-right font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payrollRun.payslips?.map((payslip: any) => (
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
                    <TableCell className="text-right text-orange-600">
                      {formatCurrency(payslip.nssf_employer)}
                    </TableCell>
                    <TableCell className="text-right text-orange-600">
                      {formatCurrency(payslip.ahl_employer)}
                    </TableCell>
                    <TableCell className="text-right text-orange-600">
                      {formatCurrency(payslip.nita)}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-blue-600">
                      {formatCurrency(payslip.cost_to_company)}
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
              <TableFooter>
                <TableRow className="bg-gray-100 font-semibold">
                  <TableCell colSpan={2}>TOTALS</TableCell>
                  <TableCell className="text-right">{formatCurrency(totals.gross_pay)}</TableCell>
                  <TableCell className="text-right text-red-600">({formatCurrency(totals.nssf_employee)})</TableCell>
                  <TableCell className="text-right text-red-600">({formatCurrency(totals.shif_employee)})</TableCell>
                  <TableCell className="text-right text-red-600">({formatCurrency(totals.ahl_employee)})</TableCell>
                  <TableCell className="text-right text-red-600">({formatCurrency(totals.paye)})</TableCell>
                  <TableCell className="text-right text-green-600">{formatCurrency(totals.net_pay)}</TableCell>
                  <TableCell className="text-right text-orange-600">{formatCurrency(totals.nssf_employer)}</TableCell>
                  <TableCell className="text-right text-orange-600">{formatCurrency(totals.ahl_employer)}</TableCell>
                  <TableCell className="text-right text-orange-600">{formatCurrency(totals.nita)}</TableCell>
                  <TableCell className="text-right text-blue-600">{formatCurrency(totals.cost_to_company)}</TableCell>
                  <TableCell></TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
