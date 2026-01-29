import Link from "next/link"
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
import { formatCurrency, getMonthName } from "@/lib/utils"
import { Plus, Eye, CheckCircle, XCircle, DollarSign } from "lucide-react"
import type { UserRole, PayrollStatus } from "@/types"

export default async function PayrollPage() {
  const supabase = await createClient()

  // Get user's company and role
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from("users")
    .select("company_id, role")
    .eq("id", user?.id)
    .single()

  const userRole = (profile?.role || "employee") as UserRole

  // Get payroll runs with summary
  const { data: payrollRuns } = await supabase
    .from("payroll_runs")
    .select(`
      *,
      payslips(gross_pay, net_pay, paye)
    `)
    .eq("company_id", profile?.company_id)
    .order("year", { ascending: false })
    .order("month", { ascending: false })

  // Determine which actions the user can take
  const canProcessPayroll = ["admin", "hr"].includes(userRole)
  const canReconcileAsFinance = ["admin", "finance"].includes(userRole)
  const canApproveAsManagement = ["admin", "management"].includes(userRole)

  // Count pending approvals for the user
  const pendingForFinance = payrollRuns?.filter(r => r.status === "finance_pending").length || 0
  const pendingForMgmt = payrollRuns?.filter(r => r.status === "mgmt_pending").length || 0
  const pendingApprovedNotPaid = payrollRuns?.filter(r => r.status === "approved").length || 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Payroll</h1>
          <p className="text-muted-foreground">
            Manage monthly payroll runs
          </p>
        </div>
        {canProcessPayroll && (
          <Link href="/payroll/process">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Process Payroll
            </Button>
          </Link>
        )}
      </div>

      {/* Pending Approval Alerts */}
      {canReconcileAsFinance && pendingForFinance > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <p className="font-medium text-yellow-800">
                    {pendingForFinance} payroll{pendingForFinance > 1 ? "s" : ""} awaiting Finance reconciliation
                  </p>
                  <p className="text-sm text-yellow-600">
                    Review and reconcile payroll runs processed by HR
                  </p>
                </div>
              </div>
              <Link href="/payroll?filter=finance_pending">
                <Button variant="outline" size="sm" className="border-yellow-300 text-yellow-700 hover:bg-yellow-100">
                  Review Now
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {canApproveAsManagement && pendingForMgmt > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-blue-800">
                    {pendingForMgmt} payroll{pendingForMgmt > 1 ? "s" : ""} awaiting Management approval
                  </p>
                  <p className="text-sm text-blue-600">
                    Final approval needed before payment
                  </p>
                </div>
              </div>
              <Link href="/payroll?filter=mgmt_pending">
                <Button variant="outline" size="sm" className="border-blue-300 text-blue-700 hover:bg-blue-100">
                  Review Now
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {canProcessPayroll && pendingApprovedNotPaid > 0 && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-green-800">
                    {pendingApprovedNotPaid} payroll{pendingApprovedNotPaid > 1 ? "s" : ""} approved and ready for payment
                  </p>
                  <p className="text-sm text-green-600">
                    Mark as paid after processing payments
                  </p>
                </div>
              </div>
              <Link href="/payroll?filter=approved">
                <Button variant="outline" size="sm" className="border-green-300 text-green-700 hover:bg-green-100">
                  View
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {canProcessPayroll && payrollRuns?.some(r => ["hr_rejected", "mgmt_rejected"].includes(r.status)) && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                  <XCircle className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="font-medium text-red-800">
                    Payroll Rejected
                  </p>
                  <p className="text-sm text-red-600">
                    One or more payroll runs have been rejected and require corrections
                  </p>
                </div>
              </div>
              <Link href="/payroll?filter=rejected">
                <Button variant="outline" size="sm" className="border-red-300 text-red-700 hover:bg-red-100">
                  Fix Now
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Payroll History</CardTitle>
          <CardDescription>
            All payroll runs for your company
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Period</TableHead>
                <TableHead>Employees</TableHead>
                <TableHead>Total Gross</TableHead>
                <TableHead>Total Net</TableHead>
                <TableHead>Total PAYE</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payrollRuns?.map((run) => {
                const totalGross = run.payslips?.reduce(
                  (sum: number, p: { gross_pay: number }) => sum + (p.gross_pay || 0),
                  0
                ) || 0
                const totalNet = run.payslips?.reduce(
                  (sum: number, p: { net_pay: number }) => sum + (p.net_pay || 0),
                  0
                ) || 0
                const totalPaye = run.payslips?.reduce(
                  (sum: number, p: { paye: number }) => sum + (p.paye || 0),
                  0
                ) || 0

                const showApproveButton =
                  (canReconcileAsFinance && run.status === "finance_pending") ||
                  (canApproveAsManagement && run.status === "mgmt_pending")

                return (
                  <TableRow key={run.id}>
                    <TableCell className="font-medium">
                      {getMonthName(run.month)} {run.year}
                    </TableCell>
                    <TableCell>{run.payslips?.length || 0}</TableCell>
                    <TableCell>{formatCurrency(totalGross)}</TableCell>
                    <TableCell>{formatCurrency(totalNet)}</TableCell>
                    <TableCell>{formatCurrency(totalPaye)}</TableCell>
                    <TableCell>
                      <PayrollStatusBadge status={run.status as PayrollStatus} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {showApproveButton && (
                          <Link href={`/payroll/${run.id}/approve`}>
                            <Button variant="default" size="sm">
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Review
                            </Button>
                          </Link>
                        )}
                        <Link href={`/payroll/${run.id}`}>
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
              {(!payrollRuns || payrollRuns.length === 0) && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <p className="text-muted-foreground">No payroll runs yet</p>
                    {canProcessPayroll && (
                      <Link href="/payroll/process">
                        <Button variant="link">Process your first payroll</Button>
                      </Link>
                    )}
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
