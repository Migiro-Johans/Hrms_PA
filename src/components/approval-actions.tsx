"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle2, XCircle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
import { processApprovalAction } from "@/lib/actions/workflow"

interface ApprovalActionsProps {
  requestId: string
  approverId: string
  entityName: string
  onSuccess?: () => void
}

export function ApprovalActions({
  requestId,
  approverId,
  entityName,
  onSuccess,
}: ApprovalActionsProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isRejecting, setIsRejecting] = useState(false)
  const [comments, setComments] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleAction = async (action: "approved" | "rejected") => {
    if (action === "rejected" && !comments.trim()) {
      toast({
        title: "Comment required",
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
        action,
        comments: comments.trim(),
      })

      if (result.error) throw new Error(result.error)

      toast({
        title: action === "approved" ? "Approved" : "Rejected",
        description: `Successfully ${action} ${entityName}.`,
      })

      if (onSuccess) {
        onSuccess()
      } else {
        router.refresh()
      }
    } catch (error) {
      toast({
        title: "Action failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader>
        <CardTitle className="text-lg">Review Actions</CardTitle>
        <CardDescription>
          Provide your decision for this {entityName}.
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
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setComments(e.target.value)}
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
              disabled={isLoading}
            >
              <XCircle className="mr-2 h-4 w-4" />
              Reject
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={() => handleAction("approved")}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="mr-2 h-4 w-4" />
              )}
              Approve
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="ghost"
              onClick={() => setIsRejecting(false)}
              disabled={isLoading}
            >
              Back
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleAction("rejected")}
              disabled={isLoading}
            >
              {isLoading ? (
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
  )
}
