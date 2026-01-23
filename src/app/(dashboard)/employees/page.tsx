import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatCurrency, formatDate } from "@/lib/utils"
import { Plus, Upload, Eye } from "lucide-react"

export default async function EmployeesPage() {
  const supabase = await createClient()

  // Get user's company
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from("users")
    .select("company_id")
    .eq("id", user?.id)
    .single()

  // Get employees with salary structures
  // Note: Using explicit foreign key hint for departments due to multiple relationships
  const { data: employees } = await supabase
    .from("employees")
    .select(`
      *,
      departments:department_id(name),
      pay_grades:pay_grade_id(pay_group, pay_grade),
      salary_structures(basic_salary, car_allowance, meal_allowance, telephone_allowance)
    `)
    .eq("company_id", profile?.company_id)
    .order("staff_id")

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Employees</h1>
          <p className="text-muted-foreground">
            Manage your company's employees
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/employees/import">
            <Button variant="outline">
              <Upload className="mr-2 h-4 w-4" />
              Import CSV
            </Button>
          </Link>
          <Link href="/employees/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Employee
            </Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Employee List</CardTitle>
          <CardDescription>
            {employees?.length || 0} employees found
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Staff ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Job Role</TableHead>
                <TableHead>Basic Salary</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees?.map((employee) => {
                const latestSalary = employee.salary_structures?.[0]
                return (
                  <TableRow key={employee.id}>
                    <TableCell className="font-medium">
                      {employee.staff_id}
                    </TableCell>
                    <TableCell>
                      {employee.first_name} {employee.middle_name} {employee.last_name}
                    </TableCell>
                    <TableCell>
                      {employee.departments?.name || "-"}
                    </TableCell>
                    <TableCell>{employee.job_role || "-"}</TableCell>
                    <TableCell>
                      {latestSalary
                        ? formatCurrency(latestSalary.basic_salary)
                        : "-"}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                          employee.status === "active"
                            ? "bg-green-100 text-green-700"
                            : employee.status === "terminated"
                            ? "bg-red-100 text-red-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {employee.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/employees/${employee.id}`}>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                )
              })}
              {(!employees || employees.length === 0) && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <p className="text-muted-foreground">No employees found</p>
                    <Link href="/employees/new">
                      <Button variant="link">Add your first employee</Button>
                    </Link>
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
