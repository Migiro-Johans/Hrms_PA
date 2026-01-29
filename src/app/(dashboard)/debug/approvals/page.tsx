import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export default async function DebugApprovalsPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect("/login")
    }

    const { data: profile } = await supabase
        .from("users")
        .select("*, employees:employee_id(*)")
        .eq("id", user.id)
        .single()

    // Get all approval requests
    const { data: allApprovals, error: approvalsError } = await supabase
        .from("approval_requests")
        .select("*, workflow_definitions(*), requester:employees!approval_requests_requester_id_fkey(first_name, last_name, manager_id)")
        .eq("company_id", profile.company_id)
        .order("created_at", { ascending: false })

    // Get all workflow definitions
    const { data: workflows, error: workflowsError } = await supabase
        .from("workflow_definitions")
        .select("*")
        .eq("company_id", profile.company_id)

    return (
        <div className="container mx-auto py-6 space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Debug: Approvals System</h1>
                <p className="text-sm text-muted-foreground">Diagnostic information</p>
            </div>

            <div className="space-y-4">
                <div className="bg-white p-4 rounded-lg border">
                    <h2 className="font-bold mb-2">Current User Info</h2>
                    <pre className="text-xs bg-gray-50 p-2 rounded overflow-auto">
                        {JSON.stringify({
                            id: user.id,
                            email: user.email,
                            role: profile.role,
                            employee_id: profile.employee_id,
                            is_line_manager: profile.employees?.is_line_manager,
                            company_id: profile.company_id
                        }, null, 2)}
                    </pre>
                </div>

                <div className="bg-white p-4 rounded-lg border">
                    <h2 className="font-bold mb-2">Workflow Definitions ({workflows?.length || 0})</h2>
                    {workflowsError && (
                        <p className="text-red-500 text-sm">Error: {workflowsError.message}</p>
                    )}
                    <pre className="text-xs bg-gray-50 p-2 rounded overflow-auto max-h-96">
                        {JSON.stringify(workflows, null, 2)}
                    </pre>
                </div>

                <div className="bg-white p-4 rounded-lg border">
                    <h2 className="font-bold mb-2">All Approval Requests ({allApprovals?.length || 0})</h2>
                    {approvalsError && (
                        <p className="text-red-500 text-sm">Error: {approvalsError.message}</p>
                    )}
                    <pre className="text-xs bg-gray-50 p-2 rounded overflow-auto max-h-96">
                        {JSON.stringify(allApprovals, null, 2)}
                    </pre>
                </div>
            </div>
        </div>
    )
}
