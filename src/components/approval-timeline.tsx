"use client"

import { CheckCircle2, XCircle, Clock, User } from "lucide-react"
import { cn } from "@/lib/utils"
import type { PayrollRun } from "@/types"

interface ApprovalStep {
  step: number
  role: string
  label: string
  status: "pending" | "approved" | "rejected" | "waiting"
  approver?: string
  timestamp?: string
  comments?: string
}

interface ApprovalTimelineProps {
  payrollRun: PayrollRun
  className?: string
}

export function ApprovalTimeline({ payrollRun, className }: ApprovalTimelineProps) {
  // Build approval steps based on payroll run status and data
  const steps: ApprovalStep[] = [
    {
      step: 1,
      role: "finance",
      label: "Finance Reconciliation",
      status: getStepStatus(payrollRun, 1),
      approver: payrollRun.finance_approved_by ? "Finance Team" : undefined,
      timestamp: payrollRun.finance_approved_at,
      comments: payrollRun.status === "finance_rejected" ? payrollRun.rejection_comments : undefined,
    },
    {
      step: 2,
      role: "management",
      label: "Management Approval & Payment",
      status: getStepStatus(payrollRun, 2),
      approver: payrollRun.management_approved_by || payrollRun.paid_by ? "Management" : undefined,
      timestamp: payrollRun.management_approved_at || payrollRun.paid_at,
      comments: payrollRun.status === "mgmt_rejected" ? payrollRun.rejection_comments : undefined,
    },
  ]

  return (
    <div className={cn("space-y-4", className)}>
      <h3 className="text-sm font-medium text-gray-900">Approval Progress</h3>
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />

        <div className="space-y-6">
          {steps.map((step, index) => (
            <div key={step.step} className="relative flex items-start gap-4">
              {/* Icon */}
              <div
                className={cn(
                  "relative z-10 flex h-8 w-8 items-center justify-center rounded-full",
                  step.status === "approved" && "bg-green-100",
                  step.status === "rejected" && "bg-red-100",
                  step.status === "pending" && "bg-yellow-100",
                  step.status === "waiting" && "bg-gray-100"
                )}
              >
                {step.status === "approved" && (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                )}
                {step.status === "rejected" && (
                  <XCircle className="h-5 w-5 text-red-600" />
                )}
                {step.status === "pending" && (
                  <Clock className="h-5 w-5 text-yellow-600" />
                )}
                {step.status === "waiting" && (
                  <User className="h-5 w-5 text-gray-400" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p
                    className={cn(
                      "text-sm font-medium",
                      step.status === "waiting" && "text-gray-400",
                      step.status !== "waiting" && "text-gray-900"
                    )}
                  >
                    {step.label}
                  </p>
                  {step.status === "pending" && (
                    <span className="inline-flex items-center rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800">
                      Awaiting
                    </span>
                  )}
                </div>

                {step.approver && (
                  <p className="text-xs text-gray-500 mt-0.5">
                    {step.approver}
                  </p>
                )}

                {step.timestamp && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(step.timestamp).toLocaleString()}
                  </p>
                )}

                {step.comments && (
                  <p className="text-xs text-red-600 mt-1 italic">
                    "{step.comments}"
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function getStepStatus(
  payrollRun: PayrollRun,
  step: number
): "pending" | "approved" | "rejected" | "waiting" {
  const status = payrollRun.status

  switch (step) {
    case 1: // Finance Reconciliation
      if (status === "draft" || status === "processing") return "waiting"
      if (status === "finance_pending") return "pending"
      if (status === "finance_rejected") return "rejected"
      return "approved" // If we're past finance_pending, Finance has approved

    case 2: // Management Approval & Payment
      if (["draft", "processing", "finance_pending", "finance_rejected"].includes(status))
        return "waiting"
      if (status === "mgmt_pending") return "pending"
      if (status === "mgmt_rejected") return "rejected"
      if (status === "paid") return "approved"
      return "waiting"

    default:
      return "waiting"
  }
}
