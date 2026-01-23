import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar, CheckCircle2, XCircle } from "lucide-react"

export default async function LeaveApprovalsPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect("/login")
    }

    // Mock pending approvals
    const pendingApprovals = [
        { id: "1", employee: "John Doe", type: "Annual", start_date: "2024-03-10", end_date: "2024-03-15", days: 6, reason: "Family vacation" },
        { id: "2", employee: "Jane Smith", type: "Sick", start_date: "2024-02-25", end_date: "2024-02-26", days: 2, reason: "Medical appointment" },
    ]

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
                                    <CardTitle className="text-lg">{request.employee}</CardTitle>
                                    <CardDescription>{request.type} Leave Request</CardDescription>
                                </div>
                                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Pending</Badge>
                            </CardHeader>
                            <CardContent>
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2 text-sm">
                                            <Calendar className="h-4 w-4 text-muted-foreground" />
                                            <span>{new Date(request.start_date).toLocaleDateString()} - {new Date(request.end_date).toLocaleDateString()}</span>
                                            <span className="font-medium text-gray-900">({request.days} days)</span>
                                        </div>
                                        <p className="text-sm text-muted-foreground italic">"{request.reason}"</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50">
                                            <XCircle className="mr-2 h-4 w-4" /> Reject
                                        </Button>
                                        <Button size="sm" className="bg-green-600 hover:bg-green-700">
                                            <CheckCircle2 className="mr-2 h-4 w-4" /> Approve
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    )
}
