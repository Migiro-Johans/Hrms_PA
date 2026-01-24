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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/components/ui/use-toast"
import { ArrowLeft, Plus, FileText, Trash2, Download, ExternalLink } from "lucide-react"
import {
  getDepartmentByIdAction,
  getDepartmentDocumentsAction,
  createDepartmentDocumentAction,
  deleteDepartmentDocumentAction,
  canManageDepartmentAction,
} from "@/lib/actions/departments"

interface Document {
  id: string
  department_id: string
  type: "policy" | "sop" | "guideline" | "other"
  title: string
  content?: string
  file_url?: string
  is_active: boolean
  created_by?: string
  created_at: string
  creator?: {
    first_name: string
    last_name: string
  }
}

interface PageProps {
  params: { id: string }
}

export default function DepartmentDocumentsPage({ params }: PageProps) {
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [department, setDepartment] = useState<any>(null)
  const [documents, setDocuments] = useState<Document[]>([])
  const [canManage, setCanManage] = useState(false)
  const [employeeId, setEmployeeId] = useState<string>("")

  const [dialogOpen, setDialogOpen] = useState(false)

  // Form state
  const [title, setTitle] = useState("")
  const [type, setType] = useState<Document["type"]>("policy")
  const [content, setContent] = useState("")

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
    const empId = (profile?.employees as any)?.id
    setEmployeeId(empId || "")

    const dept = await getDepartmentByIdAction(params.id)
    if (!dept) {
      router.push("/departments")
      return
    }

    const docs = await getDepartmentDocumentsAction(params.id)
    const hasAccess = await canManageDepartmentAction(user.id, params.id, userRole, empId)

    setDepartment(dept)
    setDocuments(docs)
    setCanManage(hasAccess)
    setLoading(false)
  }

  const resetForm = () => {
    setTitle("")
    setType("policy")
    setContent("")
  }

  const handleCreateDocument = async () => {
    if (!title.trim()) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Document title is required",
      })
      return
    }

    setSaving(true)

    const result = await createDepartmentDocumentAction({
      departmentId: params.id,
      type,
      title: title.trim(),
      content: content.trim() || undefined,
      createdBy: employeeId,
    })

    if (result.error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: result.error,
      })
    } else {
      // Refresh documents
      const docs = await getDepartmentDocumentsAction(params.id)
      setDocuments(docs)

      toast({
        title: "Success",
        description: "Document created successfully",
      })
      setDialogOpen(false)
      resetForm()
    }

    setSaving(false)
  }

  const handleDeleteDocument = async (documentId: string) => {
    const result = await deleteDepartmentDocumentAction(documentId, params.id)

    if (result.error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: result.error,
      })
    } else {
      setDocuments(documents.filter((d) => d.id !== documentId))
      toast({
        title: "Deleted",
        description: "Document has been removed",
      })
    }
  }

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      policy: "Policy",
      sop: "SOP",
      guideline: "Guideline",
      other: "Other",
    }
    return labels[type] || type
  }

  const getTypeBadgeVariant = (type: string) => {
    const variants: Record<string, "default" | "secondary" | "info" | "warning"> = {
      policy: "default",
      sop: "info",
      guideline: "secondary",
      other: "warning",
    }
    return variants[type] || "secondary"
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
            <h1 className="text-2xl font-bold tracking-tight">Policies & Documents</h1>
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
                Add Document
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add New Document</DialogTitle>
                <DialogDescription>
                  Create a policy, SOP, or guideline for this department
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Title *</Label>
                    <Input
                      id="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g., Work From Home Policy"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="type">Type</Label>
                    <Select value={type} onValueChange={(v) => setType(v as Document["type"])}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="policy">Policy</SelectItem>
                        <SelectItem value="sop">Standard Operating Procedure (SOP)</SelectItem>
                        <SelectItem value="guideline">Guideline</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="content">Content</Label>
                  <Textarea
                    id="content"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Enter the document content here..."
                    rows={10}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => {
                  setDialogOpen(false)
                  resetForm()
                }}>
                  Cancel
                </Button>
                <Button onClick={handleCreateDocument} disabled={saving}>
                  {saving ? "Creating..." : "Create Document"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {documents.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="h-12 w-12 rounded-full bg-orange-50 flex items-center justify-center mb-4">
              <FileText className="h-6 w-6 text-orange-500" />
            </div>
            <h3 className="text-lg font-semibold">No Documents Yet</h3>
            <p className="text-muted-foreground mt-1">
              {canManage
                ? "Start by adding policies and SOPs for this department"
                : "No documents have been uploaded for this department"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {documents.map((doc) => (
            <Card key={doc.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-lg bg-gray-50 flex items-center justify-center">
                      <FileText className="h-5 w-5 text-gray-600" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{doc.title}</CardTitle>
                      <CardDescription>
                        Created {new Date(doc.created_at).toLocaleDateString()}
                        {doc.creator && ` by ${doc.creator.first_name} ${doc.creator.last_name}`}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={getTypeBadgeVariant(doc.type)}>
                      {getTypeLabel(doc.type)}
                    </Badge>
                    {canManage && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Document?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{doc.title}"? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteDocument(doc.id)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>
              </CardHeader>
              {doc.content && (
                <CardContent>
                  <div className="prose prose-sm max-w-none text-muted-foreground whitespace-pre-wrap">
                    {doc.content.length > 500
                      ? `${doc.content.substring(0, 500)}...`
                      : doc.content}
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
