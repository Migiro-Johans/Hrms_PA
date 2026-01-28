"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { ArrowLeft } from "lucide-react"

interface Department {
  id: string
  name: string
}

export default function EditEmployeePage() {
  const router = useRouter()
  const params = useParams()
  const employeeId = params.id as string
  const { toast } = useToast()
  const supabase = createClient()

  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [departments, setDepartments] = useState<Department[]>([])

  const [formData, setFormData] = useState({
    staff_id: "",
    first_name: "",
    last_name: "",
    middle_name: "",
    gender: "",
    email: "",
    phone: "",
    employment_date: "",
    department_id: "",
    job_role: "",
    kra_pin: "",
    nssf_number: "",
    nhif_number: "",
    bank_name: "",
    account_number: "",
    basic_salary: "",
    car_allowance: "",
    meal_allowance: "",
    telephone_allowance: "",
    housing_allowance: "",
    status: "active",
  })

  useEffect(() => {
    loadEmployeeData()
    loadDepartments()
  }, [])

  const loadEmployeeData = async () => {
    try {
      const { data, error } = await supabase
        .from("employees")
        .select("*")
        .eq("id", employeeId)
        .single()

      if (error) throw error

      if (data) {
        setFormData({
          staff_id: data.staff_id || "",
          first_name: data.first_name || "",
          last_name: data.last_name || "",
          middle_name: data.middle_name || "",
          gender: data.gender || "",
          email: data.email || "",
          phone: data.phone || "",
          employment_date: data.employment_date || "",
          department_id: data.department_id || "",
          job_role: data.job_role || "",
          kra_pin: data.kra_pin || "",
          nssf_number: data.nssf_number || "",
          nhif_number: data.nhif_number || "",
          bank_name: data.bank_name || "",
          account_number: data.account_number || "",
          basic_salary: data.basic_salary?.toString() || "",
          car_allowance: data.car_allowance?.toString() || "",
          meal_allowance: data.meal_allowance?.toString() || "",
          telephone_allowance: data.telephone_allowance?.toString() || "",
          housing_allowance: data.housing_allowance?.toString() || "",
          status: data.status || "active",
        })
      }
    } catch (error) {
      console.error("Error loading employee:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load employee data",
      })
    } finally {
      setInitialLoading(false)
    }
  }

  const loadDepartments = async () => {
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      const { data: profile } = await supabase
        .from("users")
        .select("company_id")
        .eq("id", user.id)
        .single()

      if (profile?.company_id) {
        const { data: deptData } = await supabase
          .from("departments")
          .select("id, name")
          .eq("company_id", profile.company_id)
          .order("name")

        setDepartments(deptData || [])
      }
    }
  }

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const updateData = {
        staff_id: formData.staff_id,
        first_name: formData.first_name,
        last_name: formData.last_name,
        middle_name: formData.middle_name || null,
        gender: formData.gender || null,
        email: formData.email || null,
        phone: formData.phone || null,
        employment_date: formData.employment_date,
        department_id: formData.department_id,
        job_role: formData.job_role || null,
        kra_pin: formData.kra_pin || null,
        nssf_number: formData.nssf_number || null,
        nhif_number: formData.nhif_number || null,
        bank_name: formData.bank_name || null,
        account_number: formData.account_number || null,
        basic_salary: formData.basic_salary ? parseFloat(formData.basic_salary) : null,
        car_allowance: formData.car_allowance ? parseFloat(formData.car_allowance) : null,
        meal_allowance: formData.meal_allowance ? parseFloat(formData.meal_allowance) : null,
        telephone_allowance: formData.telephone_allowance ? parseFloat(formData.telephone_allowance) : null,
        housing_allowance: formData.housing_allowance ? parseFloat(formData.housing_allowance) : null,
        status: formData.status,
        updated_at: new Date().toISOString(),
      }

      const { error } = await supabase
        .from("employees")
        .update(updateData)
        .eq("id", employeeId)

      if (error) throw error

      toast({
        title: "Success",
        description: "Employee updated successfully",
      })

      router.push("/employees")
    } catch (error: any) {
      console.error("Error updating employee:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to update employee",
      })
    } finally {
      setLoading(false)
    }
  }

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading employee data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/employees")}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Edit Employee</h1>
          <p className="text-muted-foreground">
            Update employee information
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>Basic employee details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="staff_id">Staff ID *</Label>
                  <Input
                    id="staff_id"
                    value={formData.staff_id}
                    onChange={(e) => handleChange("staff_id", e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gender">Gender</Label>
                  <Select
                    value={formData.gender}
                    onValueChange={(value) => handleChange("gender", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name">First Name *</Label>
                  <Input
                    id="first_name"
                    value={formData.first_name}
                    onChange={(e) => handleChange("first_name", e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="middle_name">Middle Name</Label>
                  <Input
                    id="middle_name"
                    value={formData.middle_name}
                    onChange={(e) => handleChange("middle_name", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name">Last Name *</Label>
                  <Input
                    id="last_name"
                    value={formData.last_name}
                    onChange={(e) => handleChange("last_name", e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => handleChange("phone", e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="employment_date">Employment Date *</Label>
                  <Input
                    id="employment_date"
                    type="date"
                    value={formData.employment_date}
                    onChange={(e) => handleChange("employment_date", e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="department_id">Department *</Label>
                  <Select
                    value={formData.department_id}
                    onValueChange={(value) => handleChange("department_id", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((dept) => (
                        <SelectItem key={dept.id} value={dept.id}>
                          {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="job_role">Job Role</Label>
                <Input
                  id="job_role"
                  value={formData.job_role}
                  onChange={(e) => handleChange("job_role", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => handleChange("status", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Statutory Information</CardTitle>
              <CardDescription>Tax and social security details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="kra_pin">KRA PIN</Label>
                <Input
                  id="kra_pin"
                  value={formData.kra_pin}
                  onChange={(e) => handleChange("kra_pin", e.target.value.toUpperCase())}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nssf_number">NSSF Number</Label>
                <Input
                  id="nssf_number"
                  value={formData.nssf_number}
                  onChange={(e) => handleChange("nssf_number", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nhif_number">NHIF/SHA Number</Label>
                <Input
                  id="nhif_number"
                  value={formData.nhif_number}
                  onChange={(e) => handleChange("nhif_number", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bank_name">Bank Name</Label>
                <Input
                  id="bank_name"
                  value={formData.bank_name}
                  onChange={(e) => handleChange("bank_name", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="account_number">Account Number</Label>
                <Input
                  id="account_number"
                  value={formData.account_number}
                  onChange={(e) => handleChange("account_number", e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Salary Structure</CardTitle>
              <CardDescription>Monthly earnings breakdown</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="basic_salary">Basic Salary (KES)</Label>
                  <Input
                    id="basic_salary"
                    type="number"
                    step="0.01"
                    value={formData.basic_salary}
                    onChange={(e) => handleChange("basic_salary", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="car_allowance">Car Allowance (KES)</Label>
                  <Input
                    id="car_allowance"
                    type="number"
                    step="0.01"
                    value={formData.car_allowance}
                    onChange={(e) => handleChange("car_allowance", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="meal_allowance">Meal Allowance (KES)</Label>
                  <Input
                    id="meal_allowance"
                    type="number"
                    step="0.01"
                    value={formData.meal_allowance}
                    onChange={(e) => handleChange("meal_allowance", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="telephone_allowance">Telephone (KES)</Label>
                  <Input
                    id="telephone_allowance"
                    type="number"
                    step="0.01"
                    value={formData.telephone_allowance}
                    onChange={(e) => handleChange("telephone_allowance", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="housing_allowance">Housing (KES)</Label>
                  <Input
                    id="housing_allowance"
                    type="number"
                    step="0.01"
                    value={formData.housing_allowance}
                    onChange={(e) => handleChange("housing_allowance", e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end gap-4 mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/employees")}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Updating..." : "Update Employee"}
          </Button>
        </div>
      </form>
    </div>
  )
}
