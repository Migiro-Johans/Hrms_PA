"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Download, Users, UserCheck, UserX, Calendar, Filter } from "lucide-react"

interface Employee {
  id: string
  staff_id: string
  first_name: string
  last_name: string
  middle_name?: string
  email?: string
  phone?: string
  gender?: string
  status: string
  employment_date: string
  termination_date?: string
  job_role?: string
  department_id?: string
  departments?: { id: string; name: string } | null
}

interface Department {
  id: string
  name: string
}

export default function EmployeeReportsPage() {
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [employees, setEmployees] = useState<Employee[]>([])
  const [departments, setDepartments] = useState<Department[]>([])

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [departmentFilter, setDepartmentFilter] = useState<string>("all")

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile } = await supabase
      .from("users")
      .select("company_id, role")
      .eq("id", user?.id)
      .single()

    if (!profile?.company_id) {
      setLoading(false)
      return
    }

    // Get all employees with department info
    const { data: empData, error: empError } = await supabase
      .from("employees")
      .select(`
        id, staff_id, first_name, last_name, middle_name, email, phone,
        gender, status, employment_date, termination_date, job_role, department_id,
        departments:department_id(id, name)
      `)
      .eq("company_id", profile.company_id)
      .order("first_name")

    if (empError) {
      console.error("Error loading employees:", empError)
    }

    // Get departments
    const { data: deptData } = await supabase
      .from("departments")
      .select("id, name")
      .eq("company_id", profile.company_id)
      .order("name")

    // Transform the data to handle Supabase's array return for foreign key joins
    const transformedEmployees = (empData || []).map((emp: any) => ({
      ...emp,
      departments: Array.isArray(emp.departments) ? emp.departments[0] : emp.departments
    })) as Employee[]

    setEmployees(transformedEmployees)
    setDepartments(deptData || [])
    setLoading(false)
  }

  // Apply filters
  const filteredEmployees = employees.filter(emp => {
    if (statusFilter !== "all" && emp.status !== statusFilter) return false
    if (departmentFilter !== "all" && emp.department_id !== departmentFilter) return false
    return true
  })

  // Calculate statistics based on filtered data
  const allEmployees = filteredEmployees
  const activeEmployees = allEmployees.filter(e => e.status === 'active')
  const terminatedEmployees = allEmployees.filter(e => e.status === 'terminated')
  const onLeaveEmployees = allEmployees.filter(e => e.status === 'on_leave')
  const suspendedEmployees = allEmployees.filter(e => e.status === 'suspended')

  // Gender breakdown
  const maleCount = activeEmployees.filter(e => e.gender?.toLowerCase() === 'male').length
  const femaleCount = activeEmployees.filter(e => e.gender?.toLowerCase() === 'female').length
  const otherGenderCount = activeEmployees.length - maleCount - femaleCount

  // Department breakdown (from all employees, not filtered)
  const departmentCounts = departments.map(dept => ({
    ...dept,
    count: employees.filter(e => e.status === 'active' && e.department_id === dept.id).length
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
  const recentHires = employees.filter(e =>
    e.status === 'active' && e.employment_date && new Date(e.employment_date) >= ninetyDaysAgo
  )

  // Recent terminations (last 90 days)
  const recentTerminations = employees.filter(e =>
    e.status === 'terminated' && e.termination_date && new Date(e.termination_date) >= ninetyDaysAgo
  )

  // Export to CSV
  const exportToCSV = () => {
    const headers = [
      "Staff ID",
      "First Name",
      "Middle Name",
      "Last Name",
      "Email",
      "Phone",
      "Gender",
      "Job Role",
      "Department",
      "Status",
      "Employment Date",
      "Termination Date"
    ]

    const rows = filteredEmployees.map(emp => [
      emp.staff_id || "",
      emp.first_name || "",
      emp.middle_name || "",
      emp.last_name || "",
      emp.email || "",
      emp.phone || "",
      emp.gender || "",
      emp.job_role || "",
      emp.departments?.name || "",
      emp.status || "",
      emp.employment_date ? new Date(emp.employment_date).toLocaleDateString() : "",
      emp.termination_date ? new Date(emp.termination_date).toLocaleDateString() : ""
    ])

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `employee_report_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active': return 'default'
      case 'on_leave': return 'secondary'
      case 'terminated': return 'destructive'
      case 'suspended': return 'outline'
      default: return 'secondary'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading report...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Employee Reports</h1>
          <p className="text-muted-foreground">
            Employee headcount, demographics, and workforce analytics
          </p>
        </div>
        <Button onClick={exportToCSV}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="w-48">
              <label className="text-sm font-medium mb-1 block">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="on_leave">On Leave</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                  <SelectItem value="terminated">Terminated</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-48">
              <label className="text-sm font-medium mb-1 block">Department</label>
              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map(dept => (
                    <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {(statusFilter !== "all" || departmentFilter !== "all") && (
              <div className="flex items-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setStatusFilter("all")
                    setDepartmentFilter("all")
                  }}
                >
                  Clear Filters
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Headcount Summary */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{allEmployees.length}</div>
            <p className="text-xs text-muted-foreground">
              {statusFilter !== "all" || departmentFilter !== "all" ? "Filtered results" : "All records"}
            </p>
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
              {activeEmployees.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No active employees</p>
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
                          style={{ width: `${employees.filter(e => e.status === 'active').length ? (dept.count / employees.filter(e => e.status === 'active').length) * 100 : 0}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium w-12 text-right">{dept.count}</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No departments configured</p>
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
                      <TableCell>{emp.departments?.name || '-'}</TableCell>
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
                      <TableCell>{emp.departments?.name || '-'}</TableCell>
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
          <CardDescription>
            {filteredEmployees.length} employee{filteredEmployees.length !== 1 ? 's' : ''}
            {(statusFilter !== "all" || departmentFilter !== "all") && " (filtered)"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Staff ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Job Role</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmployees.map(emp => (
                  <TableRow key={emp.id}>
                    <TableCell className="font-medium">{emp.staff_id}</TableCell>
                    <TableCell>
                      {emp.first_name} {emp.middle_name} {emp.last_name}
                    </TableCell>
                    <TableCell>{emp.email || '-'}</TableCell>
                    <TableCell>{emp.phone || '-'}</TableCell>
                    <TableCell>{emp.job_role || '-'}</TableCell>
                    <TableCell>{emp.departments?.name || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(emp.status)} className={
                        emp.status === 'active' ? 'bg-green-100 text-green-700' :
                        emp.status === 'on_leave' ? 'bg-yellow-100 text-yellow-700' :
                        emp.status === 'terminated' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-700'
                      }>
                        {emp.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {emp.employment_date ? new Date(emp.employment_date).toLocaleDateString() : '-'}
                    </TableCell>
                  </TableRow>
                ))}
                {filteredEmployees.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <p className="text-muted-foreground">
                        {employees.length === 0
                          ? "No employees found"
                          : "No employees match the selected filters"}
                      </p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
