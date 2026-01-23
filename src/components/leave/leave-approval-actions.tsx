"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { CheckCircle2, XCircle } from "lucide-react"
import { processApprovalAction } from "@/lib/actions/workflow"
import { useToast } from "@/components/ui/use-toast"

interface LeaveApprovalActionsProps {
    requestId: string
    approverId: string
}

export function LeaveApprovalActions({ requestId, approverId }: LeaveApprovalActionsProps) {
    const [loading, setLoading] = useState(false)
    const { toast } = useToast()

    const handleAction = async (action: 'approved' | 'rejected') => {
        setLoading(true)
        try {
            const result = await processApprovalAction({
                requestId,
                approverId,
                action,
                comments: action === 'rejected' ? 'Rejected by manager' : 'Approved'
            })

            if (result.error) {
                throw new Error(result.error)
            }

            toast({
                title: action === 'approved' ? "Request Approved" : "Request Rejected",
                description: `Successfully ${action} the leave request.`,
            })
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Failed to process approval",
                variant: "destructive",
            })
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex gap-2">
            <Button
                variant="outline"
                size="sm"
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={() => handleAction('rejected')}
                disabled={loading}
            >
                <XCircle className="mr-2 h-4 w-4" /> Reject
            </Button>
            <Button
                size="sm"
                className="bg-green-600 hover:bg-green-700"
                onClick={() => handleAction('approved')}
                disabled={loading}
            >
                <CheckCircle2 className="mr-2 h-4 w-4" /> Approve
            </Button>
        </div>
    )
}
