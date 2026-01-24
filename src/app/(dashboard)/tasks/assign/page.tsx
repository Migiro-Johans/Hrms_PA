"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
import { useToast } from "@/components/ui/use-toast"
import { ArrowLeft, Plus } from "lucide-react"
import { createTaskAction, getAssignableEmployeesAction } from "@/lib/actions/tasks"
import type { UserRole } from "@/types"

interface Employee {
  id: string
  first_name: string
  last_name: string
  departments?: { name: string }
}

export default function AssignTaskPage() {
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [employees, setEmployees] = useState<Employee[]>([])
  const [userProfile, setUserProfile] = useState<{
    companyId: string
    employeeId: string
    userRole: UserRole
    isLineManager: boolean
  } | null>(null)

  // Form state
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [assignedTo, setAssignedTo] = useState("")
  const [priority, setPriority] = useState<"low" | "medium" | "high" | "urgent">("medium")
  const [dueDate, setDueDate] = useState("")

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      router.push("/login")
      return
    }

    const { data: profile } = await supabase
      .from("users")
      .select("company_id, role, employees:employee_id(id, is_line_manager)")
      .eq("id", user.id)
      .single()

    if (!profile) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not load user profile",
      })
      return
    }

    const userRole = (profile.role || "employee") as UserRole
    const isLineManager = (profile.employees as any)?.is_line_manager || false
    const employeeId = (profile.employees as any)?.id

    // Check if user can assign tasks
    if (!["admin", "hr"].includes(userRole) && !isLineManager) {
      toast({
        variant: "destructive",
        title: "Access Denied",
        description: "You don't have permission to assign tasks",
      })
      router.push("/tasks")
      return
    }

    setUserProfile({
      companyId: profile.company_id,
      employeeId,
      userRole,
      isLineManager,
    })

    // Load assignable employees
    try {
      const employeeList = await getAssignableEmployeesAction({
        companyId: profile.company_id,
        userId: user.id,
        userRole,
        isLineManager,
        employeeId,
      })
      setEmployees(employeeList)
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not load employees",
      })
    }

    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!userProfile) return

    if (!title.trim()) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Task title is required",
      })
      return
    }

    if (!assignedTo) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please select an employee to assign the task to",
      })
      return
    }

    setSubmitting(true)

    const result = await createTaskAction({
      companyId: userProfile.companyId,
      assignedTo,
      assignedBy: userProfile.employeeId,
      title: title.trim(),
      description: description.trim() || undefined,
      priority,
      dueDate: dueDate || undefined,
    })

    if (result.error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: result.error,
      })
      setSubmitting(false)
      return
    }

    toast({
      title: "Task Created",
      description: "The task has been assigned successfully",
    })

    router.push("/tasks")
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6 max-w-2xl">
      <div className="flex items-center gap-4">
        <Link href="/tasks">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Assign Task</h1>
          <p className="text-muted-foreground">Create and assign a new task to a team member</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Task Details</CardTitle>
          <CardDescription>Fill in the task information below</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Task Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter task title"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter task description (optional)"
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="assignedTo">Assign To *</Label>
              <Select value={assignedTo} onValueChange={setAssignedTo}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.first_name} {emp.last_name}
                      {emp.departments && ` (${(emp.departments as any).name})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select value={priority} onValueChange={(v) => setPriority(v as typeof priority)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dueDate">Due Date</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                />
              </div>
            </div>

            <div className="flex justify-end gap-4 pt-4">
              <Button type="button" variant="outline" onClick={() => router.push("/tasks")}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Task
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
