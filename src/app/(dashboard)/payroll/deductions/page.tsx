"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import { formatCurrency } from "@/lib/utils"
import { Plus, Pencil, Trash2, GraduationCap, Banknote, CreditCard } from "lucide-react"

const DEDUCTION_TYPES = [
  { value: "HELB", label: "HELB (Higher Education Loan)", icon: GraduationCap },
  { value: "Loan", label: "Company Loan", icon: Banknote },
  { value: "Salary Advance", label: "Salary Advance", icon: CreditCard },
  { value: "Sacco", label: "Sacco Contribution", icon: Banknote },
  { value: "Other", label: "Other Deduction", icon: CreditCard },
]

interface Employee {
  id: string
  staff_id: string
  first_name: string
  last_name: string
}

interface RecurringDeduction {
  id: string
  employee_id: string
  deduction_type: string
  description?: string
  amount: number
  start_date: string
  end_date?: string
  is_active: boolean
  employee?: Employee
}

export default function DeductionsPage() {
  const { toast } = useToast()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [employees, setEmployees] = useState<Employee[]>([])
  const [deductions, setDeductions] = useState<RecurringDeduction[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingDeduction, setEditingDeduction] = useState<RecurringDeduction | null>(null)
  const [filterType, setFilterType] = useState<string>("all")

  // Form state
  const [formData, setFormData] = useState({
    employee_id: "",
    deduction_type: "",
    description: "",
    amount: "",
    start_date: new Date().toISOString().split("T")[0],
    end_date: "",
    is_active: true,
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile } = await supabase
      .from("users")
      .select("company_id")
      .eq("id", user?.id)
      .single()

    if (profile?.company_id) {
      // Load employees
      const { data: empData } = await supabase
        .from("employees")
        .select("id, staff_id, first_name, last_name")
        .eq("company_id", profile.company_id)
        .eq("status", "active")
        .order("first_name")

      setEmployees(empData || [])

      // Load deductions with employee info
      const { data: dedData } = await supabase
        .from("recurring_deductions")
        .select(`
          *,
          employee:employees(id, staff_id, first_name, last_name)
        `)
        .in("employee_id", (empData || []).map(e => e.id))
        .order("created_at", { ascending: false })

      setDeductions(dedData || [])
    }
    setLoading(false)
  }

  const resetForm = () => {
    setFormData({
      employee_id: "",
      deduction_type: "",
      description: "",
      amount: "",
      start_date: new Date().toISOString().split("T")[0],
      end_date: "",
      is_active: true,
    })
    setEditingDeduction(null)
  }

  const handleEdit = (deduction: RecurringDeduction) => {
    setEditingDeduction(deduction)
    setFormData({
      employee_id: deduction.employee_id,
      deduction_type: deduction.deduction_type,
      description: deduction.description || "",
      amount: deduction.amount.toString(),
      start_date: deduction.start_date,
      end_date: deduction.end_date || "",
      is_active: deduction.is_active,
    })
    setDialogOpen(true)
  }

  const handleSubmit = async () => {
    if (!formData.employee_id || !formData.deduction_type || !formData.amount) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please fill in all required fields",
      })
      return
    }

    const deductionData = {
      employee_id: formData.employee_id,
      deduction_type: formData.deduction_type,
      description: formData.description || null,
      amount: parseFloat(formData.amount),
      start_date: formData.start_date,
      end_date: formData.end_date || null,
      is_active: formData.is_active,
    }

    if (editingDeduction) {
      const { error } = await supabase
        .from("recurring_deductions")
        .update(deductionData)
        .eq("id", editingDeduction.id)

      if (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: error.message,
        })
        return
      }

      toast({
        title: "Deduction Updated",
        description: "The deduction has been updated successfully",
      })
    } else {
      const { error } = await supabase
        .from("recurring_deductions")
        .insert(deductionData)

      if (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: error.message,
        })
        return
      }

      toast({
        title: "Deduction Added",
        description: "The deduction has been added successfully",
      })
    }

    setDialogOpen(false)
    resetForm()
    loadData()
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this deduction?")) return

    const { error } = await supabase
      .from("recurring_deductions")
      .delete()
      .eq("id", id)

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      })
      return
    }

    toast({
      title: "Deduction Deleted",
      description: "The deduction has been removed",
    })
    loadData()
  }

  const toggleActive = async (deduction: RecurringDeduction) => {
    const { error } = await supabase
      .from("recurring_deductions")
      .update({ is_active: !deduction.is_active })
      .eq("id", deduction.id)

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      })
      return
    }

    toast({
      title: deduction.is_active ? "Deduction Paused" : "Deduction Activated",
      description: `The deduction has been ${deduction.is_active ? "paused" : "activated"}`,
    })
    loadData()
  }

  const filteredDeductions = filterType === "all"
    ? deductions
    : deductions.filter(d => d.deduction_type === filterType)

  // Summary stats
  const totalActive = deductions.filter(d => d.is_active).length
  const totalHELB = deductions.filter(d => d.deduction_type === "HELB" && d.is_active)
    .reduce((sum, d) => sum + d.amount, 0)
  const totalLoans = deductions.filter(d => d.deduction_type === "Loan" && d.is_active)
    .reduce((sum, d) => sum + d.amount, 0)

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 w-48 bg-gray-200 rounded mb-2" />
          <div className="h-4 w-64 bg-gray-200 rounded" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Manage Deductions</h1>
          <p className="text-muted-foreground">
            Configure recurring deductions for employees (loans, HELB, salary advances)
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) resetForm()
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Deduction
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingDeduction ? "Edit Deduction" : "Add New Deduction"}
              </DialogTitle>
              <DialogDescription>
                Configure a recurring deduction for an employee
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Employee *</Label>
                <Select
                  value={formData.employee_id}
                  onValueChange={(value) => setFormData({ ...formData, employee_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.first_name} {emp.last_name} ({emp.staff_id})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Deduction Type *</Label>
                <Select
                  value={formData.deduction_type}
                  onValueChange={(value) => setFormData({ ...formData, deduction_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {DEDUCTION_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  placeholder="e.g., Car loan, Emergency advance"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Monthly Amount (KES) *</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Date *</Label>
                  <Input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Date (optional)</Label>
                  <Input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit}>
                {editingDeduction ? "Update" : "Add"} Deduction
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Deductions</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalActive}</div>
            <p className="text-xs text-muted-foreground">
              {deductions.length} total configured
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total HELB/month</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalHELB)}</div>
            <p className="text-xs text-muted-foreground">
              {deductions.filter(d => d.deduction_type === "HELB" && d.is_active).length} employees
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Loans/month</CardTitle>
            <Banknote className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalLoans)}</div>
            <p className="text-xs text-muted-foreground">
              {deductions.filter(d => d.deduction_type === "Loan" && d.is_active).length} employees
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Monthly</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(deductions.filter(d => d.is_active).reduce((sum, d) => sum + d.amount, 0))}
            </div>
            <p className="text-xs text-muted-foreground">All active deductions</p>
          </CardContent>
        </Card>
      </div>

      {/* Deductions Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recurring Deductions</CardTitle>
              <CardDescription>
                All configured employee deductions
              </CardDescription>
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {DEDUCTION_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDeductions.map((deduction) => (
                <TableRow key={deduction.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">
                        {deduction.employee?.first_name} {deduction.employee?.last_name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {deduction.employee?.staff_id}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{deduction.deduction_type}</Badge>
                  </TableCell>
                  <TableCell>{deduction.description || "-"}</TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(deduction.amount)}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <p>From: {new Date(deduction.start_date).toLocaleDateString()}</p>
                      {deduction.end_date && (
                        <p className="text-muted-foreground">
                          To: {new Date(deduction.end_date).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={deduction.is_active ? "success" : "secondary"}
                      className="cursor-pointer"
                      onClick={() => toggleActive(deduction)}
                    >
                      {deduction.is_active ? "Active" : "Paused"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(deduction)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(deduction.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredDeductions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <p className="text-muted-foreground">No deductions configured</p>
                    <Button
                      variant="link"
                      onClick={() => setDialogOpen(true)}
                      className="mt-2"
                    >
                      Add your first deduction
                    </Button>
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
