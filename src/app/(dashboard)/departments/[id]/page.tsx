import { redirect, notFound } from "next/navigation"
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
import { ArrowLeft, Building2, Users, Target, FileText, Settings, CheckCircle2, Clock } from "lucide-react"
import { getDepartmentByIdAction, getDepartmentEmployeesAction, getDepartmentDocumentsAction, canManageDepartmentAction } from "@/lib/actions/departments"

interface PageProps {
  params: { id: string }
}

export default async function DepartmentDetailPage({ params }: PageProps) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const { data: profile } = await supabase
    .from("users")
    .select("company_id, role, employees:employee_id(id, is_line_manager)")
    .eq("id", user.id)
    .single()

  const userRole = profile?.role || "employee"
  const employeeId = (profile?.employees as any)?.id

  const department = await getDepartmentByIdAction(params.id)

  if (!department) {
    notFound()
  }

  const employees = await getDepartmentEmployeesAction(params.id)
  const documents = await getDepartmentDocumentsAction(params.id)
  const canManage = await canManageDepartmentAction(user.id, params.id, userRole, employeeId)

  // Calculate objective progress
  const objectives = department.objectives || []
  const completedObjectives = objectives.filter((o: any) => o.status === "completed").length
  const objectiveProgress = objectives.length > 0 ? Math.round((completedObjectives / objectives.length) * 100) : 0

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/departments">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{department.name}</h1>
            <p className="text-muted-foreground">
              {department.description || "Department overview and management"}
            </p>
          </div>
        </div>
        {canManage && (
          <div className="flex items-center gap-2">
            <Link href={`/departments/${params.id}/objectives`}>
              <Button variant="outline">
                <Target className="h-4 w-4 mr-2" />
                Manage Objectives
              </Button>
            </Link>
            <Link href={`/departments/${params.id}/documents`}>
              <Button variant="outline">
                <FileText className="h-4 w-4 mr-2" />
                Manage Documents
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-blue-50 flex items-center justify-center">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Employees</p>
                <p className="text-2xl font-bold">{employees.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-green-50 flex items-center justify-center">
                <Target className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Objectives</p>
                <p className="text-2xl font-bold">{objectives.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-purple-50 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Progress</p>
                <p className="text-2xl font-bold">{objectiveProgress}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-orange-50 flex items-center justify-center">
                <FileText className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Documents</p>
                <p className="text-2xl font-bold">{documents.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Line Manager */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Line Manager</CardTitle>
          </CardHeader>
          <CardContent>
            {department.line_manager ? (
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center">
                  <span className="text-lg font-medium">
                    {department.line_manager.first_name?.[0]}{department.line_manager.last_name?.[0]}
                  </span>
                </div>
                <div>
                  <p className="font-medium">
                    {department.line_manager.first_name} {department.line_manager.last_name}
                  </p>
                  <p className="text-sm text-muted-foreground">Department Head</p>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground">No line manager assigned</p>
            )}
          </CardContent>
        </Card>

        {/* Objectives Overview */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Objectives</CardTitle>
            {canManage && (
              <Link href={`/departments/${params.id}/objectives`}>
                <Button variant="ghost" size="sm">View All</Button>
              </Link>
            )}
          </CardHeader>
          <CardContent>
            {objectives.length === 0 ? (
              <p className="text-muted-foreground text-sm">No objectives defined yet</p>
            ) : (
              <div className="space-y-3">
                {objectives.slice(0, 3).map((obj: any) => (
                  <div key={obj.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {obj.status === "completed" ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : (
                        <Clock className="h-4 w-4 text-yellow-500" />
                      )}
                      <span className="text-sm truncate max-w-[200px]">{obj.title}</span>
                    </div>
                    <Badge variant={obj.status === "completed" ? "success" : "secondary"}>
                      {obj.status || "pending"}
                    </Badge>
                  </div>
                ))}
                {objectives.length > 3 && (
                  <p className="text-sm text-muted-foreground">
                    +{objectives.length - 3} more objectives
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Employees Table */}
      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>
            {employees.length} employee{employees.length !== 1 ? "s" : ""} in this department
          </CardDescription>
        </CardHeader>
        <CardContent>
          {employees.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No employees assigned to this department
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Job Title</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map((emp: any) => (
                  <TableRow key={emp.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
                          <span className="text-xs font-medium">
                            {emp.first_name?.[0]}{emp.last_name?.[0]}
                          </span>
                        </div>
                        <span className="font-medium">
                          {emp.first_name} {emp.last_name}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{emp.job_title || "-"}</TableCell>
                    <TableCell className="text-muted-foreground">{emp.email || "-"}</TableCell>
                    <TableCell>
                      {emp.is_line_manager && (
                        <Badge variant="info">Line Manager</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Recent Documents */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Policies & Documents</CardTitle>
            <CardDescription>Department policies, SOPs, and guidelines</CardDescription>
          </div>
          {canManage && (
            <Link href={`/departments/${params.id}/documents`}>
              <Button variant="ghost" size="sm">Manage</Button>
            </Link>
          )}
        </CardHeader>
        <CardContent>
          {documents.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No documents uploaded yet
            </p>
          ) : (
            <div className="space-y-3">
              {documents.slice(0, 5).map((doc: any) => (
                <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-sm">{doc.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {doc.type} - {new Date(doc.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline">{doc.type}</Badge>
                </div>
              ))}
              {documents.length > 5 && (
                <Link href={`/departments/${params.id}/documents`}>
                  <Button variant="ghost" size="sm" className="w-full">
                    View all {documents.length} documents
                  </Button>
                </Link>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
