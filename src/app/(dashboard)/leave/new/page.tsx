import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { NewLeaveForm } from "@/components/leave/new-leave-form"

export default async function NewLeavePage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect("/login")
    }

    return (
        <div className="container mx-auto py-6">
            <NewLeaveForm />
        </div>
    )
}
