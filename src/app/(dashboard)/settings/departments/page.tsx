"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useToast } from "@/components/ui/use-toast"
import { Building2, Plus, Pencil, Trash2, ArrowLeft, Loader2, Users } from "lucide-react"
import Link from "next/link"

interface Department {
  id: string
  company_id: string
  name: string
  description?: string
  line_manager_id?: string
  created_at: string
  companies?: { name: string }
  line_manager?: { id: string; first_name: string; last_name: string }
  _count?: { employees: number }
}

interface Company {
  id: string
  name: string
}

interface Employee {
  id: string
  first_name: string
  last_name: string
  staff_id: string
  is_line_manager: boolean
}

export default function DepartmentsManagementPage() {
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [departments, setDepartments] = useState<Department[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [isAdmin, setIsAdmin] = useState(false)
  const [userCompanyId, setUserCompanyId] = useState<string | null>(null)

  // Dialog states
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    company_id: "",
    name: "",
    description: "",
    line_manager_id: "",
  })

  useEffect(() => {
    checkAccessAndLoadData()
  }, [])

  const checkAccessAndLoadData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push("/login")
      return
    }

    const { data: profile } = await supabase
      .from("users")
      .select("role, company_id")
      .eq("id", user.id)
      .single()

    if (profile?.role !== "admin") {
      router.push("/dashboard")
      return
    }

    setIsAdmin(true)
    setUserCompanyId(profile.company_id)
    await loadData(profile.company_id)
  }

  const loadData = async (companyId: string | null) => {
    setLoading(true)

    // Load companies (admin can see all)
    const { data: companiesData } = await supabase
      .from("companies")
      .select("id, name")
      .order("name")

    setCompanies(companiesData || [])

    // Load departments with employee count
    let query = supabase
      .from("departments")
      .select(`
        id, company_id, name, description, line_manager_id, created_at,
        companies:company_id(name),
        line_manager:line_manager_id(id, first_name, last_name)
      `)
      .order("name")

    const { data: deptData, error: deptError } = await query

    if (deptError) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load departments",
      })
    } else {
      // Get employee counts for each department
      const deptsWithCounts = await Promise.all(
        (deptData || []).map(async (dept: any) => {
          const { count } = await supabase
            .from("employees")
            .select("*", { count: "exact", head: true })
            .eq("department_id", dept.id)
            .eq("status", "active")

          return {
            ...dept,
            companies: Array.isArray(dept.companies) ? dept.companies[0] : dept.companies,
            line_manager: Array.isArray(dept.line_manager) ? dept.line_manager[0] : dept.line_manager,
            _count: { employees: count || 0 }
          }
        })
      )
      setDepartments(deptsWithCounts)
    }

    // Load employees for line manager selection
    const { data: empData } = await supabase
      .from("employees")
      .select("id, first_name, last_name, staff_id, is_line_manager")
      .eq("status", "active")
      .order("first_name")

    setEmployees(empData || [])
    setLoading(false)
  }

  const resetForm = () => {
    setFormData({
      company_id: userCompanyId || "",
      name: "",
      description: "",
      line_manager_id: "",
    })
  }

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Department name is required",
      })
      return
    }

    if (!formData.company_id) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select a company",
      })
      return
    }

    setIsSubmitting(true)
    const { error } = await supabase
      .from("departments")
      .insert({
        company_id: formData.company_id,
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        line_manager_id: formData.line_manager_id || null,
      })

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      })
    } else {
      toast({
        title: "Success",
        description: "Department created successfully",
      })

      // If a line manager was selected, update their is_line_manager status
      if (formData.line_manager_id) {
        await supabase
          .from("employees")
          .update({ is_line_manager: true })
          .eq("id", formData.line_manager_id)
      }

      setIsCreateOpen(false)
      resetForm()
      await loadData(userCompanyId)
    }
    setIsSubmitting(false)
  }

  const handleEdit = async () => {
    if (!selectedDepartment || !formData.name.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Department name is required",
      })
      return
    }

    setIsSubmitting(true)
    const { error } = await supabase
      .from("departments")
      .update({
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        line_manager_id: formData.line_manager_id || null,
      })
      .eq("id", selectedDepartment.id)

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      })
    } else {
      toast({
        title: "Success",
        description: "Department updated successfully",
      })

      // Update line manager status
      if (formData.line_manager_id) {
        await supabase
          .from("employees")
          .update({ is_line_manager: true })
          .eq("id", formData.line_manager_id)
      }

      setIsEditOpen(false)
      setSelectedDepartment(null)
      resetForm()
      await loadData(userCompanyId)
    }
    setIsSubmitting(false)
  }

  const handleDelete = async () => {
    if (!selectedDepartment) return

    setIsSubmitting(true)
    const { error } = await supabase
      .from("departments")
      .delete()
      .eq("id", selectedDepartment.id)

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message.includes("violates foreign key")
          ? "Cannot delete department with existing employees"
          : error.message,
      })
    } else {
      toast({
        title: "Success",
        description: "Department deleted successfully",
      })
      setIsDeleteOpen(false)
      setSelectedDepartment(null)
      await loadData(userCompanyId)
    }
    setIsSubmitting(false)
  }

  const openEditDialog = (dept: Department) => {
    setSelectedDepartment(dept)
    setFormData({
      company_id: dept.company_id,
      name: dept.name || "",
      description: dept.description || "",
      line_manager_id: dept.line_manager_id || "",
    })
    setIsEditOpen(true)
  }

  const openDeleteDialog = (dept: Department) => {
    setSelectedDepartment(dept)
    setIsDeleteOpen(true)
  }

  // Filter employees by selected company for line manager selection
  const getEmployeesForCompany = (companyId: string) => {
    // In a real scenario, you'd filter by company_id
    // For now, return all employees
    return employees
  }

  if (!isAdmin || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  // Pre-defined department suggestions
  const departmentSuggestions = [
    "Finance",
    "IT",
    "HR",
    "Sales",
    "Operations",
    "Collections and Recovery",
    "Credit",
    "Marketing",
    "Legal",
    "Administration",
  ]

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/settings">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">Department Management</h1>
          <p className="text-muted-foreground">
            Create and manage departments across companies
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Department
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Department</DialogTitle>
              <DialogDescription>
                Add a new department to a company
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="company">Company *</Label>
                <Select
                  value={formData.company_id}
                  onValueChange={(value) => setFormData({ ...formData, company_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a company" />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.map((company) => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Department Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter department name"
                  list="dept-suggestions"
                />
                <datalist id="dept-suggestions">
                  {departmentSuggestions.map((dept) => (
                    <option key={dept} value={dept} />
                  ))}
                </datalist>
                <p className="text-xs text-muted-foreground">
                  Suggestions: Finance, IT, HR, Sales, Operations, Collections and Recovery, Credit
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of the department"
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="line_manager">Line Manager</Label>
                <Select
                  value={formData.line_manager_id}
                  onValueChange={(value) => setFormData({ ...formData, line_manager_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a line manager (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No line manager</SelectItem>
                    {getEmployeesForCompany(formData.company_id).map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.first_name} {emp.last_name} ({emp.staff_id})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create Department
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Departments</CardTitle>
          <CardDescription>
            {departments.length} department{departments.length !== 1 ? "s" : ""} in the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          {departments.length === 0 ? (
            <div className="text-center py-8">
              <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No departments found. Create your first department.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Department</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Line Manager</TableHead>
                  <TableHead>Employees</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {departments.map((dept) => (
                  <TableRow key={dept.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-green-50 flex items-center justify-center">
                          <Building2 className="h-5 w-5 text-green-600" />
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
                    <TableCell>{dept.companies?.name || "-"}</TableCell>
                    <TableCell>
                      {dept.line_manager ? (
                        <span>
                          {dept.line_manager.first_name} {dept.line_manager.last_name}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Not assigned</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span>{dept._count?.employees || 0}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(dept)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => openDeleteDialog(dept)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Department</DialogTitle>
            <DialogDescription>
              Update department information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Department Name *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter department name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of the department"
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-line_manager">Line Manager</Label>
              <Select
                value={formData.line_manager_id}
                onValueChange={(value) => setFormData({ ...formData, line_manager_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a line manager (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No line manager</SelectItem>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.first_name} {emp.last_name} ({emp.staff_id})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleEdit} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Department</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedDepartment?.name}"? This action cannot be undone.
              Departments with employees cannot be deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete Department
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
