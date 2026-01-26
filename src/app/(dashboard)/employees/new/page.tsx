"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
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
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/components/ui/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Copy, Check, User, AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface UserCredentials {
  email: string
  temporary_password: string
  user_id: string
}

export default function NewEmployeePage() {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [createUserAccount, setCreateUserAccount] = useState(true)
  const [showCredentialsDialog, setShowCredentialsDialog] = useState(false)
  const [userCredentials, setUserCredentials] = useState<UserCredentials | null>(null)
  const [copiedField, setCopiedField] = useState<string | null>(null)

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

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedField(field)
      setTimeout(() => setCopiedField(null), 2000)
    } catch (err) {
      console.error("Failed to copy:", err)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Validate email is provided if creating user account
      if (createUserAccount && !formData.email) {
        toast({
          variant: "destructive",
          title: "Email Required",
          description: "Email is required when creating a user account",
        })
        setLoading(false)
        return
      }

      const response = await fetch("/api/employees", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          create_user_account: createUserAccount,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        toast({
          variant: "destructive",
          title: "Error",
          description: data.error || "Failed to create employee",
        })
        return
      }

      // Check if user credentials were returned
      if (data.user_credentials) {
        setUserCredentials(data.user_credentials)
        setShowCredentialsDialog(true)
        toast({
          title: "Success",
          description: "Employee and user account created successfully",
        })
      } else if (data.warning) {
        toast({
          variant: "destructive",
          title: "Partial Success",
          description: data.warning,
        })
        router.push("/employees")
      } else {
        toast({
          title: "Success",
          description: "Employee created successfully",
        })
        router.push("/employees")
      }
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

  const handleDialogClose = () => {
    setShowCredentialsDialog(false)
    setUserCredentials(null)
    router.push("/employees")
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
                  <Label htmlFor="email">
                    Email {createUserAccount && "*"}
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                    required={createUserAccount}
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

          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                User Account
              </CardTitle>
              <CardDescription>
                Create a login account for this employee
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="create_user_account"
                  checked={createUserAccount}
                  onCheckedChange={(checked) => setCreateUserAccount(checked === true)}
                />
                <Label htmlFor="create_user_account" className="cursor-pointer">
                  Create user account for this employee
                </Label>
              </div>

              {createUserAccount && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    A user account will be created with the employee's email address.
                    A temporary password will be generated and displayed after creation.
                    Make sure to share the credentials with the employee securely.
                  </AlertDescription>
                </Alert>
              )}
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

      {/* Credentials Dialog */}
      <Dialog open={showCredentialsDialog} onOpenChange={setShowCredentialsDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Check className="h-5 w-5 text-green-600" />
              Employee Created Successfully
            </DialogTitle>
            <DialogDescription>
              A user account has been created. Please share these credentials securely with the employee.
            </DialogDescription>
          </DialogHeader>

          {userCredentials && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Email</Label>
                <div className="flex items-center gap-2">
                  <Input
                    value={userCredentials.email}
                    readOnly
                    className="flex-1 bg-muted"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(userCredentials.email, "email")}
                  >
                    {copiedField === "email" ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Temporary Password</Label>
                <div className="flex items-center gap-2">
                  <Input
                    value={userCredentials.temporary_password}
                    readOnly
                    className="flex-1 bg-muted font-mono"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(userCredentials.temporary_password, "password")}
                  >
                    {copiedField === "password" ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  This password will not be shown again. Make sure to copy it now and share it securely with the employee.
                </AlertDescription>
              </Alert>
            </div>
          )}

          <DialogFooter>
            <Button onClick={handleDialogClose}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
