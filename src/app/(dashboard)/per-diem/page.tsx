import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Plane, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { getPerDiemRequestsAction } from "@/lib/actions/per-diem"
import { Badge } from "@/components/ui/badge"

export default async function PerDiemPage() {
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

    const requests = await getPerDiemRequestsAction({
        employeeId: profile?.employees?.id
    })

    return (
        <div className="container mx-auto py-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Per Diem Management</h2>
                    <p className="text-muted-foreground">Submit and track your travel expense claims</p>
                </div>
                <Link href="/per-diem/new">
                    <Button className="flex items-center gap-2">
                        <Plus className="h-4 w-4" /> New Claim
                    </Button>
                </Link>
            </div>

            {requests.length === 0 ? (
                <Card className="border-dashed flex flex-col items-center justify-center py-12 text-center">
                    <div className="h-12 w-12 rounded-full bg-orange-50 flex items-center justify-center mb-4">
                        <Plane className="h-6 w-6 text-orange-500" />
                    </div>
                    <CardHeader>
                        <CardTitle>No claims found</CardTitle>
                        <CardDescription>
                            You haven't submitted any per diem claims yet.
                        </CardDescription>
                    </CardHeader>
                </Card>
            ) : (
                <div className="grid gap-4">
                    {requests.map((request: any) => (
                        <Card key={request.id}>
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <div>
                                    <CardTitle className="text-lg">{request.destination}</CardTitle>
                                    <CardDescription>{request.purpose}</CardDescription>
                                </div>
                                <Badge
                                    variant={
                                        request.status === 'approved' ? 'success' :
                                            request.status === 'rejected' ? 'destructive' :
                                                (request.status === 'finance_pending' || request.status === 'management_pending') ? 'warning' : 'secondary'
                                    }
                                >
                                    {(request.status === 'finance_pending' || request.status === 'management_pending') ? 'In Review' : request.status.replace('_', ' ').charAt(0).toUpperCase() + request.status.replace('_', ' ').slice(1)}
                                </Badge>
                            </CardHeader>
                            <CardContent>
                                <div className="flex justify-between items-center">
                                    <div className="text-sm text-muted-foreground">
                                        {new Date(request.start_date).toLocaleDateString()} - {new Date(request.end_date).toLocaleDateString()}
                                        <span className="ml-2 font-medium">({request.days} days)</span>
                                    </div>
                                    <div className="text-lg font-bold">
                                        KES {Number(request.total_amount).toLocaleString()}
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
