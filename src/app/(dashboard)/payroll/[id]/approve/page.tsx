"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { ApprovalTimeline } from "@/components/approval-timeline"
import { useToast } from "@/components/ui/use-toast"
import { formatCurrency, getMonthName } from "@/lib/utils"
import { ArrowLeft, AlertTriangle, CheckCircle2, XCircle, Loader2 } from "lucide-react"
import { processApprovalAction, getApprovalStatusAction } from "@/lib/actions/workflow"
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
  const [currentUserId, setCurrentUserId] = useState<string>("")
  const [currentEmployeeId, setCurrentEmployeeId] = useState<string>("")
  const [approvalRequestId, setApprovalRequestId] = useState<string>("")
  const [approvalHistory, setApprovalHistory] = useState<any[]>([])
  const [totals, setTotals] = useState({ gross: 0, net: 0, paye: 0, nssf: 0, shif: 0, ahl: 0 })

  // Approval state
  const [isRejecting, setIsRejecting] = useState(false)
  const [comments, setComments] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    loadData()
  }, [params.id])

  const loadData = async () => {
    setLoading(true)

    // Get user and profile
    const { data: { user } } = await supabase.auth.getUser()
    setCurrentUserId(user?.id || "")

    const { data: profile } = await supabase
      .from("users")
      .select("company_id, role, employee_id")
      .eq("id", user?.id)
      .single()

    setUserRole((profile?.role || "employee") as UserRole)
    setCurrentEmployeeId(profile?.employee_id || "")

    // Get payroll run
    const { data, error } = await supabase
      .from("payroll_runs")
      .select(`
        *,
        payslips(
          *,
          employees:employee_id(id, first_name, last_name, staff_id, departments:department_id(name))
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

    // Get approval request for this payroll
    const approvalStatus = await getApprovalStatusAction("payroll", params.id)
    if (approvalStatus.data?.id) {
      setApprovalRequestId(approvalStatus.data.id)
      
      // Load approval history
      const { data: historyData } = await supabase
        .from("approval_actions")
        .select(`
          *,
          employees:approver_id(first_name, last_name)
        `)
        .eq("request_id", approvalStatus.data.id)
        .order("created_at", { ascending: true })
      
      if (historyData) {
        setApprovalHistory(historyData)
      }
    }

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

  const handleApproval = async (action: "approve" | "reject") => {
    if (action === "reject" && !comments.trim()) {
      toast({
        variant: "destructive",
        title: "Comment required",
        description: "Please provide a reason for rejection.",
      })
      return
    }

    setIsSubmitting(true)

    // Capture current status before processing
    const currentStatus = payrollRun?.status

    try {
      // Process the approval request workflow - this handles all status updates
      if (approvalRequestId && currentEmployeeId) {
        await processApprovalAction({
          requestId: approvalRequestId,
          approverId: currentEmployeeId,
          action: action === "approve" ? "approved" : "rejected",
          comments: comments.trim() || (action === "approve" ? "Approved" : "Rejected"),
        })
      } else {
        throw new Error("Missing approval request or employee information")
      }

      toast({
        title: action === "approve" ? "Payroll Approved" : "Payroll Rejected",
        description: action === "approve"
          ? currentStatus === "hr_pending" ? "The payroll has been submitted to Finance for reconciliation." :
            currentStatus === "finance_pending" ? "The payroll has been reconciled and sent to Management for approval." :
            currentStatus === "mgmt_pending" ? "The payroll has been approved and marked as paid." :
            "The payroll has been approved and moved to the next stage."
          : "The payroll has been rejected. The relevant team will be notified.",
      })

      router.push("/payroll")
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to process approval",
      })
    } finally {
      setIsSubmitting(false)
    }
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

  const isRejected = ["hr_rejected", "finance_rejected", "mgmt_rejected"].includes(payrollRun.status)

  // Determine if user can approve based on role and status
  // Step 1: HR submits, Step 2: Finance reconciles, Step 3: Management approves and marks as paid
  const isPendingApproval = ["hr_pending", "finance_pending", "mgmt_pending"].includes(payrollRun.status)
  const canSubmitAsHR = ["admin", "hr"].includes(userRole) && payrollRun.status === "hr_pending"
  const canReconcileAsFinance = ["admin", "finance"].includes(userRole) && payrollRun.status === "finance_pending"
  const canApproveAsManagement = ["admin", "management"].includes(userRole) && payrollRun.status === "mgmt_pending"
  const canApprove = canSubmitAsHR || canReconcileAsFinance || canApproveAsManagement

  // Get the approval stage label
  const getApprovalStage = () => {
    if (payrollRun.status === "hr_pending") return "HR Submission"
    if (payrollRun.status === "finance_pending") return "Finance Reconciliation"
    if (payrollRun.status === "mgmt_pending") return "Management Approval & Payment"
    return "Approval"
  }

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
                  Payroll was rejected by {payrollRun.status === "finance_rejected" ? "Finance" : "Management"}
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

          {/* Approval History */}
          {approvalHistory.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Approval History</CardTitle>
                <CardDescription>
                  Review notes and decisions from previous approval steps
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {approvalHistory.map((action: any, index: number) => {
                    const approverName = action.employees
                      ? `${action.employees.first_name} ${action.employees.last_name}`
                      : "Unknown"
                    const actionDate = new Date(action.created_at).toLocaleString("en-KE", {
                      dateStyle: "medium",
                      timeStyle: "short"
                    })
                    const stepName = 
                      action.step_number === 1 ? "HR Submission" : 
                      action.step_number === 2 ? "Finance Reconciliation" :
                      action.step_number === 3 ? "Management Approval" :
                      "Payment Processing"
                    const isApproved = action.action === "approved"
                    
                    return (
                      <div
                        key={action.id}
                        className={`p-4 rounded-lg border ${
                          isApproved ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {isApproved ? (
                              <CheckCircle2 className="h-5 w-5 text-green-600" />
                            ) : (
                              <XCircle className="h-5 w-5 text-red-600" />
                            )}
                            <div>
                              <p className="font-medium text-sm">{stepName}</p>
                              <p className="text-xs text-muted-foreground">
                                {approverName} • {actionDate}
                              </p>
                            </div>
                          </div>
                          <span
                            className={`text-xs font-medium px-2 py-1 rounded ${
                              isApproved
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {isApproved ? "Approved" : "Rejected"}
                          </span>
                        </div>
                        {action.comments && (
                          <div className="mt-2 pl-7">
                            <p className="text-sm text-gray-700">{action.comments}</p>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Direct Approval Actions */}
          {canApprove && (
            <Card className="border-2 border-primary/20">
              <CardHeader>
                <CardTitle className="text-lg">{getApprovalStage()}</CardTitle>
                <CardDescription>
                  Review and provide your decision for this payroll.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="comments" className="text-sm font-medium">
                    Comments {isRejecting && <span className="text-red-500">*</span>}
                  </label>
                  <Textarea
                    id="comments"
                    placeholder={
                      isRejecting
                        ? "Explain the reason for rejection..."
                        : "Add any additional feedback (optional)..."
                    }
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    className="min-h-[100px]"
                  />
                </div>
              </CardContent>
              <CardFooter className="flex justify-end gap-3">
                {!isRejecting ? (
                  <>
                    <Button
                      variant="outline"
                      className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                      onClick={() => setIsRejecting(true)}
                      disabled={isSubmitting}
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      Reject
                    </Button>
                    <Button
                      className="bg-green-600 hover:bg-green-700 text-white"
                      onClick={() => handleApproval("approve")}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                      )}
                      {payrollRun.status === "hr_pending" ? "Submit to Finance" :
                       payrollRun.status === "finance_pending" ? "Approve & Submit to Management" :
                       payrollRun.status === "mgmt_pending" ? "Approve & Mark as Paid" : "Approve"}
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="ghost"
                      onClick={() => setIsRejecting(false)}
                      disabled={isSubmitting}
                    >
                      Back
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => handleApproval("reject")}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <XCircle className="mr-2 h-4 w-4" />
                      )}
                      Confirm Rejection
                    </Button>
                  </>
                )}
              </CardFooter>
            </Card>
          )}

          {/* Show message when user cannot approve */}
          {!canApprove && !isRejected && (
            <Card>
              <CardContent className="py-4">
                <p className="text-sm text-muted-foreground text-center">
                  {payrollRun.status === "approved" || payrollRun.status === "paid"
                    ? "This payroll has already been approved."
                    : payrollRun.status === "finance_pending"
                      ? "Awaiting Finance reconciliation."
                      : payrollRun.status === "mgmt_pending"
                        ? "Awaiting Management approval."
                        : "No approval actions available."}
                </p>
              </CardContent>
            </Card>
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
