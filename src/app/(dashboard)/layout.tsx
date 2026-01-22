import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  // Get user profile with company and employee info (including is_line_manager)
  const { data: profile } = await supabase
    .from("users")
    .select("*, companies(*), employees(id, is_line_manager, first_name, last_name)")
    .eq("id", user.id)
    .single()

  // Restructure the profile to include employee data in expected format
  const userProfile = profile ? {
    ...profile,
    employee: profile.employees ? {
      id: profile.employees.id,
      is_line_manager: profile.employees.is_line_manager ?? false,
      first_name: profile.employees.first_name,
      last_name: profile.employees.last_name,
    } : undefined,
  } : null

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar user={userProfile} />
      <div className="lg:pl-64">
        <Header user={userProfile} />
        <main className="py-6 px-4 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  )
}
