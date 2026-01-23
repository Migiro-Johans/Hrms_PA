import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Building2, Users, Eye, Target } from "lucide-react"
import { getDepartmentsAction } from "@/lib/actions/departments"

export default async function DepartmentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const { data: profile } = await supabase
    .from("users")
    .select("company_id, role, employees(id, is_line_manager, department_id)")
    .eq("id", user.id)
    .single()

  const userRole = profile?.role || "employee"
  const isLineManager = (profile?.employees as any)?.is_line_manager || false

  // Check access - only admin, hr, management, and line managers can see departments
  if (!["admin", "hr", "management"].includes(userRole) && !isLineManager) {
    redirect("/dashboard")
  }

  let departments = await getDepartmentsAction(profile?.company_id || "")

  // If user is line manager but not HR/Admin, only show their department
  if (isLineManager && !["admin", "hr", "management"].includes(userRole)) {
    const userDeptId = (profile?.employees as any)?.department_id
    departments = departments.filter((d: any) => d.id === userDeptId)
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Departments</h2>
          <p className="text-muted-foreground">Manage departments, objectives, and team structure</p>
        </div>
      </div>

      {departments.length === 0 ? (
        <Card className="border-dashed flex flex-col items-center justify-center py-12 text-center">
          <div className="h-12 w-12 rounded-full bg-blue-50 flex items-center justify-center mb-4">
            <Building2 className="h-6 w-6 text-blue-500" />
          </div>
          <CardHeader>
            <CardTitle>No Departments Found</CardTitle>
            <CardDescription>
              There are no departments set up yet.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>All Departments</CardTitle>
            <CardDescription>
              {departments.length} department{departments.length !== 1 ? "s" : ""} in your organization
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Department</TableHead>
                  <TableHead>Line Manager</TableHead>
                  <TableHead>Employees</TableHead>
                  <TableHead>Objectives</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {departments.map((dept: any) => (
                  <TableRow key={dept.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center">
                          <Building2 className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium">{dept.name}</p>
                          {dept.description && (
                            <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                              {dept.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {dept.line_manager ? (
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
                            <span className="text-xs font-medium">
                              {dept.line_manager.first_name?.[0]}{dept.line_manager.last_name?.[0]}
                            </span>
                          </div>
                          <span className="text-sm">
                            {dept.line_manager.first_name} {dept.line_manager.last_name}
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">Not assigned</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span>{dept._count?.employees || 0}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Target className="h-4 w-4 text-muted-foreground" />
                        <span>{dept.objectives?.length || 0}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/departments/${dept.id}`}>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
