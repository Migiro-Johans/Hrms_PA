import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Award, CheckCircle2, TrendingUp, DollarSign, Briefcase } from "lucide-react"
import { getPendingApprovalsAction } from "@/lib/actions/workflow"
import { ApprovalButton } from "@/components/approval-button"
import type { UserRole } from "@/types"

export default async function PromotionApprovalsPage() {
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

    const pendingApprovals = (result.data || []).filter((req: any) => req.entity_type === 'promotion')

    return (
        <div className="container mx-auto py-6 space-y-6">
            <div>
                <h2 className="text-2xl font-bold tracking-tight">Promotion Approvals</h2>
                <p className="text-muted-foreground">Review and take action on pending promotion requests</p>
            </div>

            {pendingApprovals.length === 0 ? (
                <Card className="border-dashed flex flex-col items-center justify-center py-12 text-center">
                    <CheckCircle2 className="h-10 w-10 text-green-500 mb-4" />
                    <CardHeader>
                        <CardTitle>All caught up!</CardTitle>
                        <CardDescription>No pending promotion requests to review.</CardDescription>
                    </CardHeader>
                </Card>
            ) : (
                <div className="grid gap-4">
                    {pendingApprovals.map((request) => {
                        const metadata = request.metadata as any
                        return (
                            <Card key={request.id}>
                                <CardHeader className="flex flex-row items-center justify-between pb-2">
                                    <div>
                                        <CardTitle className="text-lg flex items-center gap-2">
                                            <Award className="h-5 w-5 text-amber-500" />
                                            {request.requester?.first_name} {request.requester?.last_name}
                                        </CardTitle>
                                        <CardDescription>
                                            Promotion Request
                                        </CardDescription>
                                    </div>
                                    <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                                        Pending Approval
                                    </Badge>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                                        <div className="space-y-4 flex-1">
                                            {/* Position Change */}
                                            <div className="flex items-center gap-4">
                                                <div className="flex-1 p-3 bg-gray-50 rounded-md">
                                                    <p className="text-xs text-muted-foreground">Current Position</p>
                                                    <p className="font-medium flex items-center gap-1">
                                                        <Briefcase className="h-3.5 w-3.5" />
                                                        {metadata?.current_position || 'N/A'}
                                                    </p>
                                                </div>
                                                <TrendingUp className="h-5 w-5 text-green-500 flex-shrink-0" />
                                                <div className="flex-1 p-3 bg-green-50 rounded-md border border-green-200">
                                                    <p className="text-xs text-green-600">New Position</p>
                                                    <p className="font-medium text-green-700 flex items-center gap-1">
                                                        <Briefcase className="h-3.5 w-3.5" />
                                                        {metadata?.new_position || 'N/A'}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Salary Change */}
                                            {(metadata?.current_salary || metadata?.new_salary) && (
                                                <div className="flex items-center gap-4">
                                                    <div className="flex-1 p-3 bg-gray-50 rounded-md">
                                                        <p className="text-xs text-muted-foreground">Current Salary</p>
                                                        <p className="font-medium flex items-center gap-1">
                                                            <DollarSign className="h-3.5 w-3.5" />
                                                            KES {Number(metadata?.current_salary || 0).toLocaleString()}
                                                        </p>
                                                    </div>
                                                    <TrendingUp className="h-5 w-5 text-green-500 flex-shrink-0" />
                                                    <div className="flex-1 p-3 bg-green-50 rounded-md border border-green-200">
                                                        <p className="text-xs text-green-600">New Salary</p>
                                                        <p className="font-medium text-green-700 flex items-center gap-1">
                                                            <DollarSign className="h-3.5 w-3.5" />
                                                            KES {Number(metadata?.new_salary || 0).toLocaleString()}
                                                        </p>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Justification */}
                                            {metadata?.justification && (
                                                <div className="p-3 bg-blue-50 rounded-md border border-blue-100">
                                                    <p className="text-sm font-medium text-blue-800">Justification:</p>
                                                    <p className="text-sm text-blue-700">{metadata.justification}</p>
                                                </div>
                                            )}

                                            {/* Effective Date */}
                                            {metadata?.effective_date && (
                                                <p className="text-sm text-muted-foreground">
                                                    Effective Date: <span className="font-medium">{new Date(metadata.effective_date).toLocaleDateString()}</span>
                                                </p>
                                            )}
                                        </div>

                                        <div className="flex-shrink-0">
                                            <ApprovalButton
                                                requestId={request.id}
                                                approverId={user.id}
                                                entityType="promotion"
                                                approverRole={profile.employees?.is_line_manager ? "line_manager" : profile.role as UserRole}
                                                variant="card"
                                            />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
