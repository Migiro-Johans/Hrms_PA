import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { NewPerDiemForm } from "@/components/per-diem/new-per-diem-form"
import { getPerDiemRatesAction } from "@/lib/actions/per-diem"

export default async function NewPerDiemPage() {
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

    const rates = await getPerDiemRatesAction(profile.company_id)

    return (
        <NewPerDiemForm
            employeeId={profile.employees.id}
            companyId={profile.company_id}
            rates={rates}
        />
    )
}
