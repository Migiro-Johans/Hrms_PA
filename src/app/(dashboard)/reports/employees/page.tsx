import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Download, Users, Building2, UserCheck, UserX, Calendar } from "lucide-react"

export default async function EmployeeReportsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from("users")
    .select("company_id, role")
    .eq("id", user?.id)
    .single()

  // Get all employees with department info
  const { data: employees } = await supabase
    .from("employees")
    .select(`
      id, staff_id, first_name, last_name, gender, status,
      employment_date, termination_date, job_title,
      department:departments(id, name)
    `)
    .eq("company_id", profile?.company_id)
    .order("first_name")

  // Get departments
  const { data: departments } = await supabase
    .from("departments")
    .select("id, name")
    .eq("company_id", profile?.company_id)
    .order("name")

  // Calculate statistics
  const allEmployees = employees || []
  const activeEmployees = allEmployees.filter(e => e.status === 'active')
  const terminatedEmployees = allEmployees.filter(e => e.status === 'terminated')
  const onLeaveEmployees = allEmployees.filter(e => e.status === 'on_leave')
  const suspendedEmployees = allEmployees.filter(e => e.status === 'suspended')

  // Gender breakdown
  const maleCount = activeEmployees.filter(e => e.gender?.toLowerCase() === 'male').length
  const femaleCount = activeEmployees.filter(e => e.gender?.toLowerCase() === 'female').length
  const otherGenderCount = activeEmployees.length - maleCount - femaleCount

  // Department breakdown
  const departmentCounts = (departments || []).map(dept => ({
    ...dept,
    count: activeEmployees.filter(e => (e.department as any)?.id === dept.id).length
  })).sort((a, b) => b.count - a.count)

  // Tenure breakdown
  const now = new Date()
  const tenureBreakdown = {
    lessThanYear: 0,
    oneToThree: 0,
    threeToFive: 0,
    fiveToTen: 0,
    moreThanTen: 0,
  }

  activeEmployees.forEach(emp => {
    if (!emp.employment_date) return
    const years = (now.getTime() - new Date(emp.employment_date).getTime()) / (1000 * 60 * 60 * 24 * 365)
    if (years < 1) tenureBreakdown.lessThanYear++
    else if (years < 3) tenureBreakdown.oneToThree++
    else if (years < 5) tenureBreakdown.threeToFive++
    else if (years < 10) tenureBreakdown.fiveToTen++
    else tenureBreakdown.moreThanTen++
  })

  // Recent hires (last 90 days)
  const ninetyDaysAgo = new Date()
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
  const recentHires = activeEmployees.filter(e =>
    e.employment_date && new Date(e.employment_date) >= ninetyDaysAgo
  )

  // Recent terminations (last 90 days)
  const recentTerminations = terminatedEmployees.filter(e =>
    e.termination_date && new Date(e.termination_date) >= ninetyDaysAgo
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Employee Reports</h1>
          <p className="text-muted-foreground">
            Employee headcount, demographics, and workforce analytics
          </p>
        </div>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export Report
        </Button>
      </div>

      {/* Headcount Summary */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{allEmployees.length}</div>
            <p className="text-xs text-muted-foreground">All time records</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <UserCheck className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{activeEmployees.length}</div>
            <p className="text-xs text-muted-foreground">Currently employed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">On Leave</CardTitle>
            <Calendar className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{onLeaveEmployees.length}</div>
            <p className="text-xs text-muted-foreground">
              {suspendedEmployees.length > 0 && `${suspendedEmployees.length} suspended`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Terminated</CardTitle>
            <UserX className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{terminatedEmployees.length}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>
      </div>

      {/* Demographics & Department Breakdown */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Gender Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Gender Distribution</CardTitle>
            <CardDescription>Active employees by gender</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">Male</span>
                <div className="flex items-center gap-2">
                  <div className="w-32 bg-muted rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full"
                      style={{ width: `${activeEmployees.length ? (maleCount / activeEmployees.length) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium w-12 text-right">{maleCount}</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Female</span>
                <div className="flex items-center gap-2">
                  <div className="w-32 bg-muted rounded-full h-2">
                    <div
                      className="bg-pink-500 h-2 rounded-full"
                      style={{ width: `${activeEmployees.length ? (femaleCount / activeEmployees.length) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium w-12 text-right">{femaleCount}</span>
                </div>
              </div>
              {otherGenderCount > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm">Other/Not specified</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 bg-muted rounded-full h-2">
                      <div
                        className="bg-gray-500 h-2 rounded-full"
                        style={{ width: `${(otherGenderCount / activeEmployees.length) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium w-12 text-right">{otherGenderCount}</span>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Department Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Department Distribution</CardTitle>
            <CardDescription>Active employees by department</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {departmentCounts.length > 0 ? (
                departmentCounts.map(dept => (
                  <div key={dept.id} className="flex items-center justify-between">
                    <span className="text-sm">{dept.name}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 bg-muted rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full"
                          style={{ width: `${activeEmployees.length ? (dept.count / activeEmployees.length) * 100 : 0}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium w-12 text-right">{dept.count}</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No departments configured</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tenure Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Tenure Distribution</CardTitle>
          <CardDescription>Active employees by years of service</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-5">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold">{tenureBreakdown.lessThanYear}</div>
              <p className="text-xs text-muted-foreground">&lt; 1 year</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold">{tenureBreakdown.oneToThree}</div>
              <p className="text-xs text-muted-foreground">1-3 years</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold">{tenureBreakdown.threeToFive}</div>
              <p className="text-xs text-muted-foreground">3-5 years</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold">{tenureBreakdown.fiveToTen}</div>
              <p className="text-xs text-muted-foreground">5-10 years</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold">{tenureBreakdown.moreThanTen}</div>
              <p className="text-xs text-muted-foreground">&gt; 10 years</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Recent Hires */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Hires</CardTitle>
            <CardDescription>Employees joined in the last 90 days</CardDescription>
          </CardHeader>
          <CardContent>
            {recentHires.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Joined</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentHires.slice(0, 5).map(emp => (
                    <TableRow key={emp.id}>
                      <TableCell className="font-medium">
                        {emp.first_name} {emp.last_name}
                      </TableCell>
                      <TableCell>{(emp.department as any)?.name || '-'}</TableCell>
                      <TableCell>{new Date(emp.employment_date).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No recent hires</p>
            )}
          </CardContent>
        </Card>

        {/* Recent Terminations */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Terminations</CardTitle>
            <CardDescription>Employees left in the last 90 days</CardDescription>
          </CardHeader>
          <CardContent>
            {recentTerminations.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Left</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentTerminations.slice(0, 5).map(emp => (
                    <TableRow key={emp.id}>
                      <TableCell className="font-medium">
                        {emp.first_name} {emp.last_name}
                      </TableCell>
                      <TableCell>{(emp.department as any)?.name || '-'}</TableCell>
                      <TableCell>{emp.termination_date ? new Date(emp.termination_date).toLocaleDateString() : '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No recent terminations</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Full Employee List */}
      <Card>
        <CardHeader>
          <CardTitle>Employee Directory</CardTitle>
          <CardDescription>Complete list of all employees</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Staff ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Job Title</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allEmployees.map(emp => (
                <TableRow key={emp.id}>
                  <TableCell className="font-medium">{emp.staff_id}</TableCell>
                  <TableCell>{emp.first_name} {emp.last_name}</TableCell>
                  <TableCell>{emp.job_title || '-'}</TableCell>
                  <TableCell>{(emp.department as any)?.name || '-'}</TableCell>
                  <TableCell>
                    <Badge variant={
                      emp.status === 'active' ? 'success' :
                      emp.status === 'on_leave' ? 'warning' :
                      emp.status === 'terminated' ? 'destructive' : 'secondary'
                    }>
                      {emp.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{new Date(emp.employment_date).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
              {allEmployees.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <p className="text-muted-foreground">No employees found</p>
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
