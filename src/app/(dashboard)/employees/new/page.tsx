"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
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
import { PAY_GROUPS } from "@/lib/constants"

export default function NewEmployeePage() {
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)

  const [formData, setFormData] = useState({
    staff_id: "",
    first_name: "",
    last_name: "",
    middle_name: "",
    gender: "",
    email: "",
    phone: "",
    employment_date: "",
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
  })

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Get user's company
      const { data: { user } } = await supabase.auth.getUser()
      const { data: profile } = await supabase
        .from("users")
        .select("company_id")
        .eq("id", user?.id)
        .single()

      if (!profile?.company_id) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Company not found",
        })
        return
      }

      // Create employee
      const { data: employee, error: employeeError } = await supabase
        .from("employees")
        .insert({
          company_id: profile.company_id,
          staff_id: formData.staff_id,
          first_name: formData.first_name,
          last_name: formData.last_name,
          middle_name: formData.middle_name || null,
          gender: formData.gender || null,
          email: formData.email || null,
          phone: formData.phone || null,
          employment_date: formData.employment_date,
          job_role: formData.job_role || null,
          kra_pin: formData.kra_pin || null,
          nssf_number: formData.nssf_number || null,
          nhif_number: formData.nhif_number || null,
          bank_name: formData.bank_name || null,
          account_number: formData.account_number || null,
          status: "active",
        })
        .select()
        .single()

      if (employeeError) {
        toast({
          variant: "destructive",
          title: "Error",
          description: employeeError.message,
        })
        return
      }

      // Create salary structure
      if (employee && formData.basic_salary) {
        const { error: salaryError } = await supabase
          .from("salary_structures")
          .insert({
            employee_id: employee.id,
            basic_salary: parseFloat(formData.basic_salary) || 0,
            car_allowance: parseFloat(formData.car_allowance) || 0,
            meal_allowance: parseFloat(formData.meal_allowance) || 0,
            telephone_allowance: parseFloat(formData.telephone_allowance) || 0,
            housing_allowance: parseFloat(formData.housing_allowance) || 0,
            effective_date: formData.employment_date,
          })

        if (salaryError) {
          console.error("Salary structure error:", salaryError)
        }
      }

      toast({
        title: "Success",
        description: "Employee created successfully",
      })
      router.push("/employees")
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create employee",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Add New Employee</h1>
        <p className="text-muted-foreground">
          Enter the employee's details below
        </p>
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
                    placeholder="e.g., HOP-001"
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
                  <Label htmlFor="job_role">Job Role</Label>
                  <Input
                    id="job_role"
                    placeholder="e.g., IT Assistant"
                    value={formData.job_role}
                    onChange={(e) => handleChange("job_role", e.target.value)}
                  />
                </div>
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
                  placeholder="e.g., A012345678Z"
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
                  placeholder="e.g., ABSA Bank Kenya PLC"
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
                    placeholder="0.00"
                    value={formData.basic_salary}
                    onChange={(e) => handleChange("basic_salary", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="car_allowance">Car Allowance (KES)</Label>
                  <Input
                    id="car_allowance"
                    type="number"
                    placeholder="0.00"
                    value={formData.car_allowance}
                    onChange={(e) => handleChange("car_allowance", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="meal_allowance">Meal Allowance (KES)</Label>
                  <Input
                    id="meal_allowance"
                    type="number"
                    placeholder="0.00"
                    value={formData.meal_allowance}
                    onChange={(e) => handleChange("meal_allowance", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="telephone_allowance">Telephone (KES)</Label>
                  <Input
                    id="telephone_allowance"
                    type="number"
                    placeholder="0.00"
                    value={formData.telephone_allowance}
                    onChange={(e) => handleChange("telephone_allowance", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="housing_allowance">Housing (KES)</Label>
                  <Input
                    id="housing_allowance"
                    type="number"
                    placeholder="0.00"
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
            {loading ? "Creating..." : "Create Employee"}
          </Button>
        </div>
      </form>
    </div>
  )
}
