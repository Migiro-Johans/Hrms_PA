"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
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
import { ApprovalActions } from "@/components/approval-actions"
import { useToast } from "@/components/ui/use-toast"
import { formatCurrency, getMonthName } from "@/lib/utils"
import { ArrowLeft, AlertTriangle } from "lucide-react"
import type { PayrollRun, UserRole } from "@/types"

interface PageProps {
  params: { id: string }
}

export default function PayrollApprovePage({ params }: PageProps) {
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [payrollRun, setPayrollRun] = useState<PayrollRun | null>(null)
  const [userRole, setUserRole] = useState<UserRole>("employee")
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [approvalRequest, setApprovalRequest] = useState<any>(null)
  const [totals, setTotals] = useState({ gross: 0, net: 0, paye: 0, nssf: 0, shif: 0, ahl: 0 })

  useEffect(() => {
    loadData()
  }, [params.id])

  const loadData = async () => {
    setLoading(true)

    // Get user and profile
    const { data: { user } } = await supabase.auth.getUser()
    setCurrentUser(user)

    const { data: profile } = await supabase
      .from("users")
      .select("company_id, role, employee_id")
      .eq("id", user?.id)
      .single()

    setUserRole((profile?.role || "employee") as UserRole)

    // Get payroll run
    const { data, error } = await supabase
      .from("payroll_runs")
      .select(`
        *,
        payslips(
          *,
          employees(id, first_name, last_name, staff_id, departments(name))
        )
      `)
      .eq("id", params.id)
      .eq("company_id", profile?.company_id)
      .single()

    if (error || !data) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Payroll run not found",
      })
      router.push("/payroll")
      return
    }

    setPayrollRun(data as PayrollRun)

    // Get workflow approval status
    const { getApprovalStatusAction } = await import("@/lib/actions/workflow")
    const statusResult = await getApprovalStatusAction("payroll", params.id)
    setApprovalRequest(statusResult.data)

    // Calculate totals
    const calculatedTotals = data.payslips?.reduce(
      (acc: typeof totals, p: { gross_pay?: number; net_pay?: number; paye?: number; nssf_employee?: number; shif_employee?: number; ahl_employee?: number }) => ({
        gross: acc.gross + (p.gross_pay || 0),
        net: acc.net + (p.net_pay || 0),
        paye: acc.paye + (p.paye || 0),
        nssf: acc.nssf + (p.nssf_employee || 0),
        shif: acc.shif + (p.shif_employee || 0),
        ahl: acc.ahl + (p.ahl_employee || 0),
      }),
      { gross: 0, net: 0, paye: 0, nssf: 0, shif: 0, ahl: 0 }
    ) || { gross: 0, net: 0, paye: 0, nssf: 0, shif: 0, ahl: 0 }

    setTotals(calculatedTotals)
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!payrollRun) return null

  const isRejected = ["hr_rejected", "mgmt_rejected"].includes(payrollRun.status)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/payroll/${params.id}`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Review Payroll</h1>
          <p className="text-muted-foreground">
            {getMonthName(payrollRun.month)} {payrollRun.year} - {payrollRun.payslips?.length || 0} employees
          </p>
        </div>
      </div>

      {/* Rejection Warning */}
      {isRejected && payrollRun.rejection_comments && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
              <div>
                <p className="font-medium text-red-800">
                  Payroll was rejected by {payrollRun.status === "hr_rejected" ? "HR" : "Management"}
                </p>
                <p className="text-sm text-red-600 mt-1">
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
            <CardDescription>Review totals before approving</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-muted-foreground">Total Gross</p>
                <p className="text-xl font-semibold">{formatCurrency(totals.gross)}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-muted-foreground">Total Deductions</p>
                <p className="text-xl font-semibold text-red-600">
                  {formatCurrency(totals.nssf + totals.shif + totals.ahl + totals.paye)}
                </p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-muted-foreground">Total Net Pay</p>
                <p className="text-xl font-semibold text-green-700">{formatCurrency(totals.net)}</p>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-2 text-center text-sm">
              <div className="p-2 bg-gray-50 rounded">
                <p className="text-muted-foreground text-xs">NSSF</p>
                <p className="font-medium">{formatCurrency(totals.nssf)}</p>
              </div>
              <div className="p-2 bg-gray-50 rounded">
                <p className="text-muted-foreground text-xs">SHIF</p>
                <p className="font-medium">{formatCurrency(totals.shif)}</p>
              </div>
              <div className="p-2 bg-gray-50 rounded">
                <p className="text-muted-foreground text-xs">AHL</p>
                <p className="font-medium">{formatCurrency(totals.ahl)}</p>
              </div>
              <div className="p-2 bg-gray-50 rounded">
                <p className="text-muted-foreground text-xs">PAYE</p>
                <p className="font-medium">{formatCurrency(totals.paye)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Approval Status & Actions */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Approval Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <ApprovalTimeline payrollRun={payrollRun as PayrollRun} />
            </CardContent>
          </Card>

          {approvalRequest && approvalRequest.status === "pending" && (
            <ApprovalActions
              requestId={approvalRequest.id}
              approverId={currentUser?.id || ""}
              entityName="Payroll"
              onSuccess={() => {
                toast({
                  title: "Action Recorded",
                  description: "Your decision has been saved and the payroll status updated.",
                })
                router.push("/payroll")
              }}
            />
          )}
        </div>
      </div>

      {/* Payslips Table */}
      <Card>
        <CardHeader>
          <CardTitle>Employee Breakdown</CardTitle>
          <CardDescription>
            Review individual payslips
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
                  <TableHead className="text-right">Deductions</TableHead>
                  <TableHead className="text-right">Net Pay</TableHead>
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
                      ({formatCurrency((payslip.nssf_employee || 0) + (payslip.shif_employee || 0) + (payslip.ahl_employee || 0) + (payslip.paye || 0))})
                    </TableCell>
                    <TableCell className="text-right font-semibold text-green-600">
                      {formatCurrency(payslip.net_pay)}
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
