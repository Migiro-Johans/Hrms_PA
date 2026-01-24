"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle2, XCircle, Loader2, MessageSquare } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from "@/components/ui/use-toast"
import { processApprovalAction } from "@/lib/actions/workflow"
import type { UserRole } from "@/types"

export type ApproverRole = UserRole | "line_manager"

interface ApprovalButtonProps {
  requestId: string
  approverId: string
  entityType: "leave" | "per_diem" | "payroll" | "promotion"
  entityName?: string
  approverRole?: ApproverRole
  variant?: "inline" | "card" | "compact"
  showRoleBadge?: boolean
  onSuccess?: () => void
}

const ROLE_LABELS: Record<ApproverRole, string> = {
  line_manager: "Line Manager",
  admin: "Admin",
  hr: "HR",
  finance: "Finance",
  management: "Management",
  employee: "Employee",
}

const ENTITY_LABELS: Record<string, string> = {
  leave: "Leave Request",
  per_diem: "Per Diem Request",
  payroll: "Payroll",
  promotion: "Promotion Request",
}

export function ApprovalButton({
  requestId,
  approverId,
  entityType,
  entityName,
  approverRole,
  variant = "inline",
  showRoleBadge = false,
  onSuccess,
}: ApprovalButtonProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [comments, setComments] = useState("")

  const displayName = entityName || ENTITY_LABELS[entityType] || "Request"
  const roleLabel = approverRole ? ROLE_LABELS[approverRole] : undefined

  const handleApprove = async () => {
    setIsLoading(true)
    try {
      const result = await processApprovalAction({
        requestId,
        approverId,
        action: "approved",
        comments: comments.trim() || `Approved by ${roleLabel || "approver"}`,
      })

      if (result.error) throw new Error(result.error)

      toast({
        title: "Approved",
        description: `Successfully approved the ${displayName.toLowerCase()}.`,
      })

      if (onSuccess) {
        onSuccess()
      } else {
        router.refresh()
      }
    } catch (error) {
      toast({
        title: "Approval Failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
      setComments("")
    }
  }

  const handleReject = async () => {
    if (!comments.trim()) {
      toast({
        title: "Reason Required",
        description: "Please provide a reason for rejection.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    try {
      const result = await processApprovalAction({
        requestId,
        approverId,
        action: "rejected",
        comments: comments.trim(),
      })

      if (result.error) throw new Error(result.error)

      toast({
        title: "Rejected",
        description: `Successfully rejected the ${displayName.toLowerCase()}.`,
      })

      setShowRejectDialog(false)

      if (onSuccess) {
        onSuccess()
      } else {
        router.refresh()
      }
    } catch (error) {
      toast({
        title: "Rejection Failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
      setComments("")
    }
  }

  // Compact variant - just icons
  if (variant === "compact") {
    return (
      <>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={() => setShowRejectDialog(true)}
            disabled={isLoading}
            title="Reject"
          >
            <XCircle className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
            onClick={handleApprove}
            disabled={isLoading}
            title="Approve"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
          </Button>
        </div>
        <RejectDialog
          open={showRejectDialog}
          onOpenChange={setShowRejectDialog}
          comments={comments}
          setComments={setComments}
          onReject={handleReject}
          isLoading={isLoading}
          entityName={displayName}
        />
      </>
    )
  }

  // Inline variant - buttons side by side
  if (variant === "inline") {
    return (
      <>
        <div className="flex items-center gap-2">
          {showRoleBadge && roleLabel && (
            <span className="text-xs font-medium text-muted-foreground bg-gray-100 px-2 py-1 rounded">
              {roleLabel}
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
            onClick={() => setShowRejectDialog(true)}
            disabled={isLoading}
          >
            <XCircle className="mr-1.5 h-4 w-4" />
            Reject
          </Button>
          <Button
            size="sm"
            className="bg-green-600 hover:bg-green-700 text-white"
            onClick={handleApprove}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="mr-1.5 h-4 w-4" />
            )}
            Approve
          </Button>
        </div>
        <RejectDialog
          open={showRejectDialog}
          onOpenChange={setShowRejectDialog}
          comments={comments}
          setComments={setComments}
          onReject={handleReject}
          isLoading={isLoading}
          entityName={displayName}
        />
      </>
    )
  }

  // Card variant - full card with comment area
  return (
    <div className="rounded-lg border-2 border-primary/20 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-semibold text-sm">Review {displayName}</h4>
          {roleLabel && (
            <p className="text-xs text-muted-foreground">Approving as {roleLabel}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="approval-comments" className="text-sm font-medium flex items-center gap-1">
          <MessageSquare className="h-3.5 w-3.5" />
          Comments (optional)
        </label>
        <Textarea
          id="approval-comments"
          placeholder="Add feedback or notes..."
          value={comments}
          onChange={(e) => setComments(e.target.value)}
          className="min-h-[80px] text-sm"
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
          onClick={() => setShowRejectDialog(true)}
          disabled={isLoading}
        >
          <XCircle className="mr-2 h-4 w-4" />
          Reject
        </Button>
        <Button
          className="bg-green-600 hover:bg-green-700 text-white"
          onClick={handleApprove}
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle2 className="mr-2 h-4 w-4" />
          )}
          Approve
        </Button>
      </div>

      <RejectDialog
        open={showRejectDialog}
        onOpenChange={setShowRejectDialog}
        comments={comments}
        setComments={setComments}
        onReject={handleReject}
        isLoading={isLoading}
        entityName={displayName}
      />
    </div>
  )
}

// Rejection dialog component
function RejectDialog({
  open,
  onOpenChange,
  comments,
  setComments,
  onReject,
  isLoading,
  entityName,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  comments: string
  setComments: (comments: string) => void
  onReject: () => void
  isLoading: boolean
  entityName: string
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-red-600">Reject {entityName}</DialogTitle>
          <DialogDescription>
            Please provide a reason for rejecting this request. This will be visible to the requester.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-4">
          <label htmlFor="reject-reason" className="text-sm font-medium">
            Reason for Rejection <span className="text-red-500">*</span>
          </label>
          <Textarea
            id="reject-reason"
            placeholder="Explain why this request is being rejected..."
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            className="min-h-[100px]"
            autoFocus
          />
        </div>
        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onReject}
            disabled={isLoading || !comments.trim()}
          >
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <XCircle className="mr-2 h-4 w-4" />
            )}
            Confirm Rejection
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Bulk approval component for approving multiple items at once
interface BulkApprovalButtonProps {
  requestIds: string[]
  approverId: string
  entityType: "leave" | "per_diem" | "payroll" | "promotion"
  onSuccess?: () => void
}

export function BulkApprovalButton({
  requestIds,
  approverId,
  entityType,
  onSuccess,
}: BulkApprovalButtonProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)

  const handleBulkApprove = async () => {
    if (requestIds.length === 0) return

    setIsLoading(true)
    let successCount = 0
    let errorCount = 0

    for (const requestId of requestIds) {
      try {
        const result = await processApprovalAction({
          requestId,
          approverId,
          action: "approved",
          comments: "Bulk approved",
        })

        if (result.error) {
          errorCount++
        } else {
          successCount++
        }
      } catch {
        errorCount++
      }
    }

    toast({
      title: "Bulk Approval Complete",
      description: `${successCount} approved, ${errorCount} failed.`,
      variant: errorCount > 0 ? "destructive" : "default",
    })

    setIsLoading(false)

    if (onSuccess) {
      onSuccess()
    } else {
      router.refresh()
    }
  }

  if (requestIds.length === 0) return null

  return (
    <Button
      className="bg-green-600 hover:bg-green-700 text-white"
      onClick={handleBulkApprove}
      disabled={isLoading}
    >
      {isLoading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <CheckCircle2 className="mr-2 h-4 w-4" />
      )}
      Approve All ({requestIds.length})
    </Button>
  )
}
