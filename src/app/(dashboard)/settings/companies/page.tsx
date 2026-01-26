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
import { Building2, Plus, Pencil, Trash2, ArrowLeft, Loader2 } from "lucide-react"
import Link from "next/link"
import type { Company } from "@/types"

export default function CompaniesManagementPage() {
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [companies, setCompanies] = useState<Company[]>([])
  const [isAdmin, setIsAdmin] = useState(false)

  // Dialog states
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    kra_pin: "",
    nssf_number: "",
    nhif_number: "",
    address: "",
    email: "",
    phone: "",
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
      .select("role")
      .eq("id", user.id)
      .single()

    if (profile?.role !== "admin") {
      router.push("/dashboard")
      return
    }

    setIsAdmin(true)
    await loadCompanies()
  }

  const loadCompanies = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from("companies")
      .select("*")
      .order("name")

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load companies",
      })
    } else {
      setCompanies(data || [])
    }
    setLoading(false)
  }

  const resetForm = () => {
    setFormData({
      name: "",
      kra_pin: "",
      nssf_number: "",
      nhif_number: "",
      address: "",
      email: "",
      phone: "",
    })
  }

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Company name is required",
      })
      return
    }

    setIsSubmitting(true)
    const { error } = await supabase
      .from("companies")
      .insert({
        name: formData.name.trim(),
        kra_pin: formData.kra_pin.trim() || null,
        nssf_number: formData.nssf_number.trim() || null,
        nhif_number: formData.nhif_number.trim() || null,
        address: formData.address.trim() || null,
        email: formData.email.trim() || null,
        phone: formData.phone.trim() || null,
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
        description: "Company created successfully",
      })
      setIsCreateOpen(false)
      resetForm()
      await loadCompanies()
    }
    setIsSubmitting(false)
  }

  const handleEdit = async () => {
    if (!selectedCompany || !formData.name.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Company name is required",
      })
      return
    }

    setIsSubmitting(true)
    const { error } = await supabase
      .from("companies")
      .update({
        name: formData.name.trim(),
        kra_pin: formData.kra_pin.trim() || null,
        nssf_number: formData.nssf_number.trim() || null,
        nhif_number: formData.nhif_number.trim() || null,
        address: formData.address.trim() || null,
        email: formData.email.trim() || null,
        phone: formData.phone.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", selectedCompany.id)

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      })
    } else {
      toast({
        title: "Success",
        description: "Company updated successfully",
      })
      setIsEditOpen(false)
      setSelectedCompany(null)
      resetForm()
      await loadCompanies()
    }
    setIsSubmitting(false)
  }

  const handleDelete = async () => {
    if (!selectedCompany) return

    setIsSubmitting(true)
    const { error } = await supabase
      .from("companies")
      .delete()
      .eq("id", selectedCompany.id)

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message.includes("violates foreign key")
          ? "Cannot delete company with existing employees or departments"
          : error.message,
      })
    } else {
      toast({
        title: "Success",
        description: "Company deleted successfully",
      })
      setIsDeleteOpen(false)
      setSelectedCompany(null)
      await loadCompanies()
    }
    setIsSubmitting(false)
  }

  const openEditDialog = (company: Company) => {
    setSelectedCompany(company)
    setFormData({
      name: company.name || "",
      kra_pin: company.kra_pin || "",
      nssf_number: company.nssf_number || "",
      nhif_number: company.nhif_number || "",
      address: company.address || "",
      email: company.email || "",
      phone: company.phone || "",
    })
    setIsEditOpen(true)
  }

  const openDeleteDialog = (company: Company) => {
    setSelectedCompany(company)
    setIsDeleteOpen(true)
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
          <h1 className="text-2xl font-bold tracking-tight">Company Management</h1>
          <p className="text-muted-foreground">
            Create and manage companies in the system
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Company
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Company</DialogTitle>
              <DialogDescription>
                Add a new company to the system
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Company Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter company name"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="kra_pin">KRA PIN</Label>
                  <Input
                    id="kra_pin"
                    value={formData.kra_pin}
                    onChange={(e) => setFormData({ ...formData, kra_pin: e.target.value })}
                    placeholder="e.g., P051234567Z"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nssf_number">NSSF Number</Label>
                  <Input
                    id="nssf_number"
                    value={formData.nssf_number}
                    onChange={(e) => setFormData({ ...formData, nssf_number: e.target.value })}
                    placeholder="NSSF employer number"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="nhif_number">NHIF Number</Label>
                <Input
                  id="nhif_number"
                  value={formData.nhif_number}
                  onChange={(e) => setFormData({ ...formData, nhif_number: e.target.value })}
                  placeholder="NHIF employer number"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="company@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+254..."
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Company address"
                  rows={2}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create Company
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Companies</CardTitle>
          <CardDescription>
            {companies.length} company{companies.length !== 1 ? "ies" : ""} in the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          {companies.length === 0 ? (
            <div className="text-center py-8">
              <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No companies found. Create your first company.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>KRA PIN</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {companies.map((company) => (
                  <TableRow key={company.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center">
                          <Building2 className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium">{company.name}</p>
                          {company.address && (
                            <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                              {company.address}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{company.kra_pin || "-"}</TableCell>
                    <TableCell>{company.email || "-"}</TableCell>
                    <TableCell>{company.phone || "-"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(company)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => openDeleteDialog(company)}
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
            <DialogTitle>Edit Company</DialogTitle>
            <DialogDescription>
              Update company information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Company Name *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter company name"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-kra_pin">KRA PIN</Label>
                <Input
                  id="edit-kra_pin"
                  value={formData.kra_pin}
                  onChange={(e) => setFormData({ ...formData, kra_pin: e.target.value })}
                  placeholder="e.g., P051234567Z"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-nssf_number">NSSF Number</Label>
                <Input
                  id="edit-nssf_number"
                  value={formData.nssf_number}
                  onChange={(e) => setFormData({ ...formData, nssf_number: e.target.value })}
                  placeholder="NSSF employer number"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-nhif_number">NHIF Number</Label>
              <Input
                id="edit-nhif_number"
                value={formData.nhif_number}
                onChange={(e) => setFormData({ ...formData, nhif_number: e.target.value })}
                placeholder="NHIF employer number"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="company@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-phone">Phone</Label>
                <Input
                  id="edit-phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+254..."
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-address">Address</Label>
              <Textarea
                id="edit-address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Company address"
                rows={2}
              />
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
            <DialogTitle>Delete Company</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedCompany?.name}"? This action cannot be undone.
              Companies with employees or departments cannot be deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete Company
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
