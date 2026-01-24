"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
import { ArrowLeft, Plus, Target, Trash2, Edit, CheckCircle2, Clock, AlertCircle } from "lucide-react"
import { getDepartmentByIdAction, updateDepartmentObjectivesAction, canManageDepartmentAction } from "@/lib/actions/departments"

interface Objective {
  id: string
  title: string
  description?: string
  target?: string
  progress?: number
  status?: "pending" | "in_progress" | "completed"
}

interface PageProps {
  params: { id: string }
}

export default function DepartmentObjectivesPage({ params }: PageProps) {
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [department, setDepartment] = useState<any>(null)
  const [objectives, setObjectives] = useState<Objective[]>([])
  const [canManage, setCanManage] = useState(false)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingObjective, setEditingObjective] = useState<Objective | null>(null)

  // Form state
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [target, setTarget] = useState("")
  const [status, setStatus] = useState<Objective["status"]>("pending")

  useEffect(() => {
    loadData()
  }, [params.id])

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

    const userRole = profile?.role || "employee"
    const employeeId = (profile?.employees as any)?.id

    const dept = await getDepartmentByIdAction(params.id)
    if (!dept) {
      router.push("/departments")
      return
    }

    const hasAccess = await canManageDepartmentAction(user.id, params.id, userRole, employeeId)

    setDepartment(dept)
    setObjectives(dept.objectives || [])
    setCanManage(hasAccess)
    setLoading(false)
  }

  const resetForm = () => {
    setTitle("")
    setDescription("")
    setTarget("")
    setStatus("pending")
    setEditingObjective(null)
  }

  const openEditDialog = (objective: Objective) => {
    setEditingObjective(objective)
    setTitle(objective.title)
    setDescription(objective.description || "")
    setTarget(objective.target || "")
    setStatus(objective.status || "pending")
    setDialogOpen(true)
  }

  const handleSaveObjective = async () => {
    if (!title.trim()) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Objective title is required",
      })
      return
    }

    setSaving(true)

    let updatedObjectives: Objective[]

    if (editingObjective) {
      // Update existing
      updatedObjectives = objectives.map((obj) =>
        obj.id === editingObjective.id
          ? { ...obj, title, description, target, status }
          : obj
      )
    } else {
      // Add new
      const newObjective: Objective = {
        id: crypto.randomUUID(),
        title,
        description: description || undefined,
        target: target || undefined,
        status,
        progress: 0,
      }
      updatedObjectives = [...objectives, newObjective]
    }

    const result = await updateDepartmentObjectivesAction(params.id, updatedObjectives)

    if (result.error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: result.error,
      })
    } else {
      setObjectives(updatedObjectives)
      toast({
        title: "Success",
        description: editingObjective ? "Objective updated" : "Objective added",
      })
      setDialogOpen(false)
      resetForm()
    }

    setSaving(false)
  }

  const handleDeleteObjective = async (objectiveId: string) => {
    const updatedObjectives = objectives.filter((obj) => obj.id !== objectiveId)

    const result = await updateDepartmentObjectivesAction(params.id, updatedObjectives)

    if (result.error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: result.error,
      })
    } else {
      setObjectives(updatedObjectives)
      toast({
        title: "Deleted",
        description: "Objective removed",
      })
    }
  }

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-5 w-5 text-green-500" />
      case "in_progress":
        return <Clock className="h-5 w-5 text-yellow-500" />
      default:
        return <AlertCircle className="h-5 w-5 text-gray-400" />
    }
  }

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case "completed":
        return <Badge variant="success">Completed</Badge>
      case "in_progress":
        return <Badge variant="warning">In Progress</Badge>
      default:
        return <Badge variant="secondary">Pending</Badge>
    }
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
    <div className="container mx-auto py-6 space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/departments/${params.id}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Objectives & KPIs</h1>
            <p className="text-muted-foreground">{department?.name}</p>
          </div>
        </div>
        {canManage && (
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open)
            if (!open) resetForm()
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Objective
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingObjective ? "Edit Objective" : "Add New Objective"}</DialogTitle>
                <DialogDescription>
                  Define a department objective with measurable targets
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Increase customer satisfaction"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Detailed description of the objective"
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="target">Target / KPI</Label>
                  <Input
                    id="target"
                    value={target}
                    onChange={(e) => setTarget(e.target.value)}
                    placeholder="e.g., Achieve 90% satisfaction rate"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select value={status} onValueChange={(v) => setStatus(v as Objective["status"])}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => {
                  setDialogOpen(false)
                  resetForm()
                }}>
                  Cancel
                </Button>
                <Button onClick={handleSaveObjective} disabled={saving}>
                  {saving ? "Saving..." : editingObjective ? "Update" : "Add Objective"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {objectives.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="h-12 w-12 rounded-full bg-green-50 flex items-center justify-center mb-4">
              <Target className="h-6 w-6 text-green-500" />
            </div>
            <h3 className="text-lg font-semibold">No Objectives Yet</h3>
            <p className="text-muted-foreground mt-1">
              {canManage
                ? "Start by adding your first department objective"
                : "No objectives have been defined for this department"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {objectives.map((objective) => (
            <Card key={objective.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    {getStatusIcon(objective.status)}
                    <div className="space-y-1">
                      <h3 className="font-semibold">{objective.title}</h3>
                      {objective.description && (
                        <p className="text-sm text-muted-foreground">{objective.description}</p>
                      )}
                      {objective.target && (
                        <p className="text-sm">
                          <span className="font-medium">Target:</span> {objective.target}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(objective.status)}
                    {canManage && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(objective)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteObjective(objective.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
