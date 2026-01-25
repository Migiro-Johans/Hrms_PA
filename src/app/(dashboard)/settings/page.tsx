import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Shield, Building2, Bell, Database, UserPlus } from "lucide-react"

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single()

  // Only admin can access settings
  if (profile?.role !== "admin") {
    redirect("/dashboard")
  }

  const settingsCards = [
    {
      title: "User Management",
      description: "Manage user roles and permissions",
      icon: Users,
      href: "/settings/users",
      color: "bg-blue-50 text-blue-600",
    },
    {
      title: "Company Settings",
      description: "Update company information and preferences",
      icon: Building2,
      href: "/settings/company",
      color: "bg-green-50 text-green-600",
    },
    {
      title: "Security",
      description: "Configure security and access controls",
      icon: Shield,
      href: "/settings/security",
      color: "bg-red-50 text-red-600",
    },
    {
      title: "Notifications",
      description: "Email notification settings",
      icon: Bell,
      href: "/settings/notifications",
      color: "bg-yellow-50 text-yellow-600",
    },
    {
      title: "Data & Backup",
      description: "Export data and manage backups",
      icon: Database,
      href: "/settings/data",
      color: "bg-purple-50 text-purple-600",
    },
    {
      title: "Test Users",
      description: "Create test users for all roles",
      icon: UserPlus,
      href: "/settings/test-users",
      color: "bg-orange-50 text-orange-600",
    },
  ]

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage system settings and configurations
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {settingsCards.map((card) => (
          <Link key={card.href} href={card.href}>
            <Card className="hover:border-primary/50 hover:shadow-md transition-all cursor-pointer h-full">
              <CardHeader>
                <div className="flex items-center gap-4">
                  <div className={`h-12 w-12 rounded-lg ${card.color} flex items-center justify-center`}>
                    <card.icon className="h-6 w-6" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{card.title}</CardTitle>
                    <CardDescription>{card.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
