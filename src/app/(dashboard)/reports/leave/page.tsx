import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Calendar, Download, TrendingUp, Users, AlertCircle } from "lucide-react"
import { formatDate } from "@/lib/utils"

export default async function LeaveReportsPage() {
  const supabase = await createClient()

  // Get current user and company
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from("users")
    .select("company_id, role")
    .eq("id", user?.id)
    .single()

  if (!profile?.company_id) {
    return <div>No company found</div>
  }

  // Get all leave requests for the company
  const { data: leaveRequests } = await supabase
    .from("leave_requests")
    .select(`
      *,
      employee:employees!leave_requests_employee_id_fkey(
        id,
        first_name,
        last_name,
        staff_id,
        department:departments(name)
      )
    `)
    .eq("company_id", profile.company_id)
    .order("created_at", { ascending: false })

  // Get leave balances for all employees
  const { data: leaveBalances } = await supabase
    .from("leave_balances")
    .select(`
      *,
      employee:employees!leave_balances_employee_id_fkey(
        id,
        first_name,
        last_name,
        staff_id,
        department:departments(name)
      )
    `)
    .eq("company_id", profile.company_id)
    .eq("year", new Date().getFullYear())

  // Calculate statistics
  const totalRequests = leaveRequests?.length || 0
  const pendingRequests = leaveRequests?.filter(r => r.status === "pending").length || 0
  const approvedRequests = leaveRequests?.filter(r => r.status === "approved").length || 0
  const rejectedRequests = leaveRequests?.filter(r => r.status === "rejected").length || 0

  // Calculate total days taken
  const totalDaysTaken = leaveRequests
    ?.filter(r => r.status === "approved")
    .reduce((sum, r) => {
      const start = new Date(r.start_date)
      const end = new Date(r.end_date)
      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
      return sum + days
    }, 0) || 0

  // Get employees with low leave balance (less than 5 days)
  const lowBalanceEmployees = leaveBalances?.filter(
    b => (b.annual_remaining || 0) < 5
  ) || []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Leave Reports</h1>
          <p className="text-muted-foreground">
            Overview of leave balances and requests for all employees
          </p>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRequests}</div>
            <p className="text-xs text-muted-foreground">
              {pendingRequests} pending approval
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved Leaves</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{approvedRequests}</div>
            <p className="text-xs text-muted-foreground">
              {totalDaysTaken} total days taken
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejected Requests</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rejectedRequests}</div>
            <p className="text-xs text-muted-foreground">
              Declined applications
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Balance Alerts</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{lowBalanceEmployees.length}</div>
            <p className="text-xs text-muted-foreground">
              Employees with &lt;5 days
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Leave Balances Table */}
      <Card>
        <CardHeader>
          <CardTitle>Leave Balances ({new Date().getFullYear()})</CardTitle>
          <CardDescription>
            Current leave balances for all employees
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Staff ID</TableHead>
                <TableHead>Employee</TableHead>
                <TableHead>Department</TableHead>
                <TableHead className="text-right">Annual Leave</TableHead>
                <TableHead className="text-right">Sick Leave</TableHead>
                <TableHead className="text-right">Maternity</TableHead>
                <TableHead className="text-right">Paternity</TableHead>
                <TableHead className="text-right">Compassionate</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leaveBalances && leaveBalances.length > 0 ? (
                leaveBalances.map((balance) => {
                  const annualRemaining = balance.annual_remaining || 0
                  const isLowBalance = annualRemaining < 5
                  
                  return (
                    <TableRow key={balance.id}>
                      <TableCell className="font-medium">
                        {balance.employee?.staff_id || "N/A"}
                      </TableCell>
                      <TableCell>
                        {balance.employee?.first_name} {balance.employee?.last_name}
                      </TableCell>
                      <TableCell>{balance.employee?.department?.name || "N/A"}</TableCell>
                      <TableCell className="text-right">
                        <span className={isLowBalance ? "text-orange-600 font-semibold" : ""}>
                          {balance.annual_remaining || 0} / {balance.annual_total || 0}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {balance.sick_remaining || 0} / {balance.sick_total || 0}
                      </TableCell>
                      <TableCell className="text-right">
                        {balance.maternity_remaining || 0} / {balance.maternity_total || 0}
                      </TableCell>
                      <TableCell className="text-right">
                        {balance.paternity_remaining || 0} / {balance.paternity_total || 0}
                      </TableCell>
                      <TableCell className="text-right">
                        {balance.compassionate_remaining || 0} / {balance.compassionate_total || 0}
                      </TableCell>
                      <TableCell>
                        {isLowBalance ? (
                          <Badge variant="warning">Low Balance</Badge>
                        ) : annualRemaining > 10 ? (
                          <Badge variant="success">Good</Badge>
                        ) : (
                          <Badge variant="secondary">Moderate</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground">
                    No leave balance records found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Recent Leave Requests */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Leave Requests</CardTitle>
          <CardDescription>
            Latest leave applications from all employees
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Staff ID</TableHead>
                <TableHead>Employee</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Leave Type</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>End Date</TableHead>
                <TableHead className="text-right">Days</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leaveRequests && leaveRequests.length > 0 ? (
                leaveRequests.slice(0, 20).map((request) => {
                  const start = new Date(request.start_date)
                  const end = new Date(request.end_date)
                  const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1

                  return (
                    <TableRow key={request.id}>
                      <TableCell className="font-medium">
                        {request.employee?.staff_id || "N/A"}
                      </TableCell>
                      <TableCell>
                        {request.employee?.first_name} {request.employee?.last_name}
                      </TableCell>
                      <TableCell>{request.employee?.department?.name || "N/A"}</TableCell>
                      <TableCell className="capitalize">{request.leave_type.replace("_", " ")}</TableCell>
                      <TableCell>{formatDate(request.start_date)}</TableCell>
                      <TableCell>{formatDate(request.end_date)}</TableCell>
                      <TableCell className="text-right">{days}</TableCell>
                      <TableCell>
                        {request.status === "approved" && (
                          <Badge variant="success">Approved</Badge>
                        )}
                        {request.status === "pending" && (
                          <Badge variant="warning">Pending</Badge>
                        )}
                        {request.status === "rejected" && (
                          <Badge variant="destructive">Rejected</Badge>
                        )}
                        {request.status === "cancelled" && (
                          <Badge variant="secondary">Cancelled</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    No leave requests found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
