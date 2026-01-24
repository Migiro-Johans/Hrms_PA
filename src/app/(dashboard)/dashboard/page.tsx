import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/lib/utils"
import { Users, DollarSign, FileText, TrendingUp } from "lucide-react"
import { PendingApprovals } from "@/components/dashboard/pending-approvals"
import { TaskSummary } from "@/components/dashboard/task-summary"
import type { UserRole } from "@/types"

export default async function DashboardPage() {
  const supabase = await createClient()

  // Get user's profile and employee info
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from("users")
    .select("*, companies:company_id(*), employees:employee_id(id, is_line_manager)")
    .eq("id", user?.id)
    .single()

  const userRole = (profile?.role || "employee") as UserRole

  // Get stats
  const { count: employeeCount } = await supabase
    .from("employees")
    .select("*", { count: "exact", head: true })
    .eq("company_id", profile?.company_id)
    .eq("status", "active")

  const { data: payrollRuns } = await supabase
    .from("payroll_runs")
    .select(`
      *,
      payslips(gross_pay, net_pay, paye)
    `)
    .eq("company_id", profile?.company_id)
    .order("year", { ascending: false })
    .order("month", { ascending: false })
    .limit(1)

  const latestPayroll = payrollRuns?.[0] || null

  const totalGross = latestPayroll?.payslips?.reduce(
    (sum: number, p: { gross_pay: number }) => sum + (p.gross_pay || 0),
    0
  ) || 0

  const totalNet = latestPayroll?.payslips?.reduce(
    (sum: number, p: { net_pay: number }) => sum + (p.net_pay || 0),
    0
  ) || 0

  const totalPaye = latestPayroll?.payslips?.reduce(
    (sum: number, p: { paye: number }) => sum + (p.paye || 0),
    0
  ) || 0

  const stats = [
    {
      name: "Active Employees",
      value: employeeCount || 0,
      icon: Users,
      description: "Total active employees",
    },
    {
      name: "Total Gross Pay",
      value: formatCurrency(totalGross),
      icon: DollarSign,
      description: "Last payroll run",
    },
    {
      name: "Total Net Pay",
      value: formatCurrency(totalNet),
      icon: TrendingUp,
      description: "Last payroll run",
    },
    {
      name: "Total PAYE",
      value: formatCurrency(totalPaye),
      icon: FileText,
      description: "Last payroll run",
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your payroll system
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.name}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.name}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {user && (
          <PendingApprovals
            user={{
              id: user.id,
              company_id: profile?.company_id || "",
              role: userRole,
              employee_id: profile?.employee_id,
              employee: profile?.employees ? {
                is_line_manager: profile.employees.is_line_manager || false
              } : undefined
            }}
          />
        )}

        {profile?.employees && (
          <TaskSummary
            employeeId={profile.employees.id}
            companyId={profile.company_id}
          />
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
            <CardDescription>Common payroll tasks</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            <a
              href="/employees/new"
              className="flex items-center gap-2 rounded-lg border p-3 hover:bg-gray-50"
            >
              <Users className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">Add New Employee</p>
                <p className="text-sm text-muted-foreground">
                  Register a new employee in the system
                </p>
              </div>
            </a>
            <a
              href="/payroll/process"
              className="flex items-center gap-2 rounded-lg border p-3 hover:bg-gray-50"
            >
              <DollarSign className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">Process Payroll</p>
                <p className="text-sm text-muted-foreground">
                  Run monthly payroll for all employees
                </p>
              </div>
            </a>
            <a
              href="/reports/p9"
              className="flex items-center gap-2 rounded-lg border p-3 hover:bg-gray-50"
            >
              <FileText className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">Generate P9 Forms</p>
                <p className="text-sm text-muted-foreground">
                  Generate tax deduction cards for employees
                </p>
              </div>
            </a>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-1">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Payroll Activity</CardTitle>
            <CardDescription>Status of the most recent payroll runs</CardDescription>
          </CardHeader>
          <CardContent>
            {latestPayroll ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">
                      Payroll - {latestPayroll.month}/{latestPayroll.year}
                    </p>
                    <p className="text-sm text-muted-foreground capitalize">
                      Status: {latestPayroll.status}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-primary">
                      {formatCurrency(totalNet)} Total Net
                    </p>
                    <span className="text-xs text-muted-foreground">
                      {latestPayroll.payslips?.length || 0} employees
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground">No payroll runs yet</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
