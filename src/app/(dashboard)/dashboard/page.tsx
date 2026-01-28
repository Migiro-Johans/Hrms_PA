import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/lib/utils"
import { Users, DollarSign, FileText, TrendingUp, Calendar, ClipboardList, Download, Target, Calculator } from "lucide-react"
import { PendingApprovals } from "@/components/dashboard/pending-approvals"
import { TaskSummary } from "@/components/dashboard/task-summary"
import { Badge } from "@/components/ui/badge"
import type { UserRole } from "@/types"

export default async function DashboardPage() {
  const supabase = await createClient()

  // Get user's profile and employee info
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from("users")
    .select("*, companies:company_id(*), employees:employee_id(id, is_line_manager, department_id)")
    .eq("id", user?.id)
    .single()

  const userRole = (profile?.role || "employee") as UserRole
  const isLineManager = profile?.employees?.is_line_manager || false
  const employeeId = profile?.employees?.id
  const departmentId = profile?.employees?.department_id

  // Check if user should see payroll summaries (finance, HR, management, admin)
  const canSeePayrollSummaries = ["admin", "hr", "finance", "management"].includes(userRole)

  // Get employee count (for roles that can see it)
  let employeeCount = 0
  if (canSeePayrollSummaries) {
    const { count } = await supabase
      .from("employees")
      .select("*", { count: "exact", head: true })
      .eq("company_id", profile?.company_id)
      .eq("status", "active")
    employeeCount = count || 0
  }

  // Get payroll data (only for roles that can see it)
  let totalGross = 0
  let totalNet = 0
  let totalPaye = 0

  if (canSeePayrollSummaries) {
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

    totalGross = latestPayroll?.payslips?.reduce(
      (sum: number, p: { gross_pay: number }) => sum + (p.gross_pay || 0),
      0
    ) || 0

    totalNet = latestPayroll?.payslips?.reduce(
      (sum: number, p: { net_pay: number }) => sum + (p.net_pay || 0),
      0
    ) || 0

    totalPaye = latestPayroll?.payslips?.reduce(
      (sum: number, p: { paye: number }) => sum + (p.paye || 0),
      0
    ) || 0
  }

  // Get department info and objectives
  let departmentInfo = null
  let departmentObjectives: any[] = []
  let departmentEmployeeCount = 0

  if (departmentId) {
    const { data: deptData } = await supabase
      .from("departments")
      .select("id, name, objectives, line_manager_id")
      .eq("id", departmentId)
      .single()

    departmentInfo = deptData

    if (deptData?.objectives) {
      departmentObjectives = Array.isArray(deptData.objectives) ? deptData.objectives : []
    }

    // Get department employee count
    const { count } = await supabase
      .from("employees")
      .select("*", { count: "exact", head: true })
      .eq("department_id", departmentId)
      .eq("status", "active")

    departmentEmployeeCount = count || 0
  }

  // Get employee's own payslip info (for employee quick actions)
  let latestPayslip = null
  if (employeeId) {
    const { data: payslipData } = await supabase
      .from("payslips")
      .select(`
        id,
        gross_pay,
        net_pay,
        payroll_runs:payroll_run_id(month, year, status)
      `)
      .eq("employee_id", employeeId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single()

    latestPayslip = payslipData
  }

  // Stats for payroll-visible roles
  const payrollStats = [
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
          {canSeePayrollSummaries
            ? "Overview of your payroll system"
            : `Welcome back${profile?.employees ? "" : ""}`}
        </p>
      </div>

      {/* Payroll Summary Stats - Only for finance, HR, management, admin */}
      {canSeePayrollSummaries && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {payrollStats.map((stat) => (
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
      )}

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

        {/* Quick Actions Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
            <CardDescription>
              {canSeePayrollSummaries ? "Common payroll tasks" : "Your quick actions"}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            {/* Employee Quick Actions - View Payslips */}
            {employeeId && (
              <a
                href="/payslips"
                className="flex items-center gap-2 rounded-lg border p-3 hover:bg-gray-50"
              >
                <FileText className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">My Payslips</p>
                  <p className="text-sm text-muted-foreground">
                    View and download your payslips
                  </p>
                </div>
              </a>
            )}

            {/* Employee Quick Actions - Download P9/G9 */}
            {employeeId && (
              <a
                href={`/api/reports/p9/${employeeId}?year=${new Date().getFullYear()}`}
                target="_blank"
                className="flex items-center gap-2 rounded-lg border p-3 hover:bg-gray-50"
              >
                <Download className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Download P9/G9 Form</p>
                  <p className="text-sm text-muted-foreground">
                    Tax deduction card for {new Date().getFullYear()}
                  </p>
                </div>
              </a>
            )}

            {/* Apply for Leave - All employees */}
            {employeeId && (
              <a
                href="/leave/new"
                className="flex items-center gap-2 rounded-lg border p-3 hover:bg-gray-50"
              >
                <Calendar className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Apply for Leave</p>
                  <p className="text-sm text-muted-foreground">
                    Submit a leave request
                  </p>
                </div>
              </a>
            )}

            {/* Create Task - All users can create their own tasks */}
            {employeeId && (
              <a
                href="/tasks"
                className="flex items-center gap-2 rounded-lg border p-3 hover:bg-gray-50"
              >
                <ClipboardList className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">My Tasks</p>
                  <p className="text-sm text-muted-foreground">
                    View and create your tasks
                  </p>
                </div>
              </a>
            )}

            {/* Line Manager: Assign Tasks to Department */}
            {isLineManager && (
              <a
                href="/tasks/assign"
                className="flex items-center gap-2 rounded-lg border p-3 hover:bg-gray-50"
              >
                <Users className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Assign Tasks</p>
                  <p className="text-sm text-muted-foreground">
                    Assign tasks to your department members
                  </p>
                </div>
              </a>
            )}

            {/* Add Employee - only for admin and HR */}
            {["admin", "hr"].includes(userRole) && (
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
            )}

            {/* Process Payroll - for admin, hr, and finance */}
            {["admin", "hr", "finance"].includes(userRole) && (
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
            )}

            {/* Manage Other Deductions - for admin, hr, and finance */}
            {["admin", "hr", "finance"].includes(userRole) && (
              <a
                href="/payroll/deductions"
                className="flex items-center gap-2 rounded-lg border p-3 hover:bg-gray-50"
              >
                <Calculator className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Manage Other Deductions</p>
                  <p className="text-sm text-muted-foreground">
                    Add or update employee deductions
                  </p>
                </div>
              </a>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Departmental Activity Section - Replaces Recent Payroll Activity */}
      <div className="grid gap-4 md:grid-cols-1">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="h-5 w-5" />
              Departmental Activity
            </CardTitle>
            <CardDescription>
              {departmentInfo?.name || "Your department"} objectives and activity
            </CardDescription>
          </CardHeader>
          <CardContent>
            {departmentInfo ? (
              <div className="space-y-4">
                {/* Department Info */}
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">{departmentInfo.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {departmentEmployeeCount} team member{departmentEmployeeCount !== 1 ? "s" : ""}
                    </p>
                  </div>
                  {isLineManager && (
                    <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                      Line Manager
                    </Badge>
                  )}
                </div>

                {/* Department Objectives */}
                <div>
                  <h4 className="font-medium mb-3">Department Objectives</h4>
                  {departmentObjectives.length > 0 ? (
                    <div className="space-y-2">
                      {departmentObjectives.slice(0, 5).map((objective: any, index: number) => (
                        <div
                          key={objective.id || index}
                          className="flex items-center justify-between p-2 border rounded-lg"
                        >
                          <div className="flex-1">
                            <p className="text-sm font-medium">{objective.title}</p>
                            {objective.description && (
                              <p className="text-xs text-muted-foreground truncate max-w-md">
                                {objective.description}
                              </p>
                            )}
                          </div>
                          <Badge
                            variant="outline"
                            className={
                              objective.status === "completed"
                                ? "bg-green-50 text-green-700 border-green-200"
                                : objective.status === "in_progress"
                                ? "bg-blue-50 text-blue-700 border-blue-200"
                                : "bg-gray-50 text-gray-700 border-gray-200"
                            }
                          >
                            {objective.status === "in_progress"
                              ? "In Progress"
                              : objective.status === "completed"
                              ? "Completed"
                              : "Pending"}
                          </Badge>
                        </div>
                      ))}
                      {departmentObjectives.length > 5 && (
                        <a
                          href={`/departments/${departmentId}/objectives`}
                          className="text-sm text-primary hover:underline"
                        >
                          View all {departmentObjectives.length} objectives
                        </a>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No objectives set for this department yet.
                      {isLineManager && (
                        <a
                          href={`/departments/${departmentId}/objectives`}
                          className="text-primary hover:underline ml-1"
                        >
                          Add objectives
                        </a>
                      )}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground">
                You are not assigned to a department yet.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
