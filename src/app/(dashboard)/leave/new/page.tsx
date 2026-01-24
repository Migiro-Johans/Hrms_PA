import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { NewLeaveForm } from "@/components/leave/new-leave-form"
import { getLeaveTypesAction } from "@/lib/actions/leave"

export default async function NewLeavePage() {
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

    const leaveTypes = await getLeaveTypesAction(profile.company_id)

    return (
        <div className="container mx-auto py-6">
            <NewLeaveForm
                employeeId={profile.employees.id}
                companyId={profile.company_id}
                leaveTypes={leaveTypes}
            />
        </div>
    )
}
