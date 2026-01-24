import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, CheckCircle2 } from "lucide-react"
import { getPendingApprovalsAction } from "@/lib/actions/workflow"
import { LeaveApprovalActions } from "@/components/leave/leave-approval-actions"

export default async function LeaveApprovalsPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect("/login")
    }

    const { data: profile } = await supabase
        .from('users')
        .select('*, employees:employee_id(*)')
        .eq('id', user.id)
        .single()

    const result = await getPendingApprovalsAction(
        profile.company_id,
        user.id,
        profile.role,
        profile.employee_id,
        profile.employees?.is_line_manager
    )

    const pendingApprovals = (result.data || []).filter((req: any) => req.entity_type === 'leave')

    return (
        <div className="container mx-auto py-6 space-y-6">
            <div>
                <h2 className="text-2xl font-bold tracking-tight">Leave Approvals</h2>
                <p className="text-muted-foreground">Review and take action on pending leave requests</p>
            </div>

            {pendingApprovals.length === 0 ? (
                <Card className="border-dashed flex flex-col items-center justify-center py-12 text-center">
                    <CheckCircle2 className="h-10 w-10 text-green-500 mb-4" />
                    <CardHeader>
                        <CardTitle>All caught up!</CardTitle>
                        <CardDescription>No pending leave requests to review.</CardDescription>
                    </CardHeader>
                </Card>
            ) : (
                <div className="grid gap-4">
                    {pendingApprovals.map((request) => (
                        <Card key={request.id}>
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <div>
                                    <CardTitle className="text-lg">
                                        {request.requester?.first_name} {request.requester?.last_name}
                                    </CardTitle>
                                    <CardDescription>
                                        {(request.metadata as any)?.leave_type_name || 'Leave'} Request
                                    </CardDescription>
                                </div>
                                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Pending</Badge>
                            </CardHeader>
                            <CardContent>
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2 text-sm">
                                            <Calendar className="h-4 w-4 text-muted-foreground" />
                                            <span>
                                                {new Date((request.metadata as any)?.start_date).toLocaleDateString()} -
                                                {new Date((request.metadata as any)?.end_date).toLocaleDateString()}
                                            </span>
                                            <span className="font-medium text-gray-900">
                                                ({(request.metadata as any)?.days_requested} days)
                                            </span>
                                        </div>
                                        <p className="text-sm text-muted-foreground italic">
                                            "{(request.metadata as any)?.reason || 'No reason provided'}"
                                        </p>
                                    </div>
                                    <LeaveApprovalActions
                                        requestId={request.id}
                                        approverId={user.id}
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    )
}
