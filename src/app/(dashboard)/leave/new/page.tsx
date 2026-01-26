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
        .select('*, employee_id, employees:employee_id(*)')
        .eq('id', user.id)
        .single()

    // Handle the employees join - could be object or array depending on Supabase response
    const employeeData = Array.isArray(profile?.employees)
        ? profile?.employees[0]
        : profile?.employees

    // Get employee ID from joined data or directly from profile
    const employeeId = employeeData?.id || profile?.employee_id

    if (!profile || !employeeId) {
        redirect("/dashboard")
    }

    const leaveTypes = await getLeaveTypesAction(profile.company_id)

    return (
        <div className="container mx-auto py-6">
            <NewLeaveForm
                employeeId={employeeId}
                companyId={profile.company_id}
                leaveTypes={leaveTypes}
            />
        </div>
    )
}
