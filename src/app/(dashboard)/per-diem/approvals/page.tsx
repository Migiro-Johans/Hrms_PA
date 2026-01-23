import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plane, CheckCircle2, Calendar, MapPin } from "lucide-react"
import { getPendingApprovalsAction } from "@/lib/actions/workflow"
import { PerDiemApprovalActions } from "@/components/per-diem/per-diem-approval-actions"

export default async function PerDiemApprovalsPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect("/login")
    }

    const { data: profile } = await supabase
        .from('users')
        .select('*, employees(*)')
        .eq('id', user.id)
        .single()

    const result = await getPendingApprovalsAction(
        profile.company_id,
        user.id,
        profile.role,
        profile.employee_id,
        profile.employees?.is_line_manager
    )

    const pendingApprovals = (result.data || []).filter((req: any) => req.entity_type === 'per_diem')

    return (
        <div className="container mx-auto py-6 space-y-6">
            <div>
                <h2 className="text-2xl font-bold tracking-tight">Per Diem Approvals</h2>
                <p className="text-muted-foreground">Review and take action on pending travel expense claims</p>
            </div>

            {pendingApprovals.length === 0 ? (
                <Card className="border-dashed flex flex-col items-center justify-center py-12 text-center">
                    <CheckCircle2 className="h-10 w-10 text-green-500 mb-4" />
                    <CardHeader>
                        <CardTitle>All caught up!</CardTitle>
                        <CardDescription>No pending per diem requests to review.</CardDescription>
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
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Plane className="h-3 w-3" />
                                        <span>Per Diem Claim</span>
                                    </div>
                                </div>
                                <Badge variant="secondary" className="bg-orange-100 text-orange-800">Pending</Badge>
                            </CardHeader>
                            <CardContent>
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                    <div className="space-y-3 flex-1">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="flex items-center gap-2 text-sm">
                                                <MapPin className="h-4 w-4 text-muted-foreground" />
                                                <span className="font-medium">{(request.metadata as any)?.destination}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-sm">
                                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                                <span>
                                                    {new Date((request.metadata as any)?.start_date).toLocaleDateString()} -
                                                    {new Date((request.metadata as any)?.end_date).toLocaleDateString()}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="p-3 bg-gray-50 rounded-md">
                                            <p className="text-sm font-medium">Purpose:</p>
                                            <p className="text-sm text-muted-foreground">{(request.metadata as any)?.purpose}</p>
                                        </div>
                                        <div className="flex justify-between items-center py-2 border-t border-dashed">
                                            <span className="text-sm">Total Claim:</span>
                                            <span className="text-lg font-bold text-primary">
                                                KES {Number((request.metadata as any)?.total_amount).toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                    <PerDiemApprovalActions
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
