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
import { formatCurrency } from "@/lib/utils"
import { Plus, Upload, Eye, Pencil } from "lucide-react"

export default async function EmployeesPage() {
  const supabase = await createClient()

  // Get user's company
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Please log in to view employees.</p>
      </div>
    )
  }

  const { data: profile } = await supabase
    .from("users")
    .select("company_id")
    .eq("id", user.id)
    .single()

  if (!profile?.company_id) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">No company associated with your account.</p>
      </div>
    )
  }

  // Get employees with salary structures
  const { data: employees, error } = await supabase
    .from("employees")
    .select(`
      *,
      departments:departments!employees_department_id_fkey(name),
      pay_grades:pay_grades!employees_pay_grade_id_fkey(pay_group, pay_grade),
      salary_structures(basic_salary, car_allowance, meal_allowance, telephone_allowance)
    `)
    .eq("company_id", profile.company_id)
    .order("staff_id")

  if (error) {
    console.error("Error fetching employees:", error)
  }

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
                const fullName = [employee.first_name, employee.middle_name, employee.last_name]
                  .filter(Boolean)
                  .join(" ")

                return (
                  <TableRow key={employee.id}>
                    <TableCell className="font-medium">
                      {employee.staff_id}
                    </TableCell>
                    <TableCell>{fullName}</TableCell>
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

                    {/* UPDATED ACTIONS */}
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {/* View */}
                        <Link href={`/employees/${employee.id}`}>
                          <Button variant="ghost" size="sm" title="View profile">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>

                        {/* Update / Edit */}
                        <Link href={`/employees/${employee.id}/edit`}>
                          <Button variant="ghost" size="sm" title="Update profile">
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </Link>
                      </div>
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
