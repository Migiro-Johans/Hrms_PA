import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { LeaveDashboard } from "@/components/leave/leave-dashboard"

export default async function LeavePage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect("/login")
    }

    return (
        <div className="container mx-auto py-6">
            <LeaveDashboard />
        </div>
    )
}
