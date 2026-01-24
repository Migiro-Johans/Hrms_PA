import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { LeaveDashboard } from "@/components/leave/leave-dashboard"
import { getLeaveBalancesAction, getLeaveRequestsAction } from "@/lib/actions/leave"

export default async function LeavePage() {
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

    if (!profile || !profile.employees) {
        redirect("/dashboard")
    }

    const balances = await getLeaveBalancesAction(profile.employees.id, new Date().getFullYear())
    const history = await getLeaveRequestsAction({
        employeeId: profile.employees.id,
        limit: 10
    })

    return (
        <div className="container mx-auto py-6">
            <LeaveDashboard
                initialBalances={balances}
                initialHistory={history}
            />
        </div>
    )
}
