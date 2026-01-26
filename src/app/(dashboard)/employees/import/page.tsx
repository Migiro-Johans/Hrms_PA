"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/components/ui/use-toast"
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle, ArrowLeft, Download, User, Copy, Check } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"

interface ParsedEmployee {
  staff_id: string
  first_name: string
  last_name: string
  middle_name?: string
  gender?: string
  email?: string
  phone?: string
  employment_date: string
  job_role?: string
  kra_pin?: string
  nssf_number?: string
  nhif_number?: string
  bank_name?: string
  account_number?: string
  basic_salary?: number
  car_allowance?: number
  meal_allowance?: number
  telephone_allowance?: number
  housing_allowance?: number
  isValid: boolean
  errors: string[]
}

interface UserCredential {
  email: string
  temporary_password: string
  name: string
}

export default function ImportEmployeesPage() {
  const router = useRouter()
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [importing, setImporting] = useState(false)
  const [parsedData, setParsedData] = useState<ParsedEmployee[]>([])
  const [fileName, setFileName] = useState("")
  const [createUserAccounts, setCreateUserAccounts] = useState(true)
  const [showCredentialsDialog, setShowCredentialsDialog] = useState(false)
  const [createdCredentials, setCreatedCredentials] = useState<UserCredential[]>([])
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)

  const expectedHeaders = [
    "staff_id",
    "first_name",
    "last_name",
    "middle_name",
    "gender",
    "email",
    "phone",
    "employment_date",
    "job_role",
    "kra_pin",
    "nssf_number",
    "nhif_number",
    "bank_name",
    "account_number",
    "basic_salary",
    "car_allowance",
    "meal_allowance",
    "telephone_allowance",
    "housing_allowance",
  ]

  const parseCSV = (text: string): ParsedEmployee[] => {
    const lines = text.split("\n").filter(line => line.trim())
    if (lines.length < 2) return []

    const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/\s+/g, "_"))

    return lines.slice(1).map(line => {
      const values = line.split(",").map(v => v.trim().replace(/^["']|["']$/g, ""))
      const employee: Record<string, string | number | boolean | string[]> = {
        isValid: true,
        errors: [] as string[],
      }

      headers.forEach((header, index) => {
        const value = values[index] || ""

        // Map common header variations
        const mappedHeader = header
          .replace("staffid", "staff_id")
          .replace("firstname", "first_name")
          .replace("lastname", "last_name")
          .replace("middlename", "middle_name")
          .replace("employmentdate", "employment_date")
          .replace("jobrole", "job_role")
          .replace("krapin", "kra_pin")
          .replace("nssfnumber", "nssf_number")
          .replace("nhifnumber", "nhif_number")
          .replace("bankname", "bank_name")
          .replace("accountnumber", "account_number")
          .replace("basicsalary", "basic_salary")
          .replace("carallowance", "car_allowance")
          .replace("mealallowance", "meal_allowance")
          .replace("telephoneallowance", "telephone_allowance")
          .replace("housingallowance", "housing_allowance")

        if (["basic_salary", "car_allowance", "meal_allowance", "telephone_allowance", "housing_allowance"].includes(mappedHeader)) {
          employee[mappedHeader] = parseFloat(value) || 0
        } else {
          employee[mappedHeader] = value
        }
      })

      // Validate required fields
      const errors: string[] = []
      if (!employee.staff_id) errors.push("Staff ID is required")
      if (!employee.first_name) errors.push("First name is required")
      if (!employee.last_name) errors.push("Last name is required")
      if (!employee.employment_date) errors.push("Employment date is required")

      // Validate date format
      if (employee.employment_date && isNaN(Date.parse(employee.employment_date as string))) {
        errors.push("Invalid employment date format (use YYYY-MM-DD)")
      }

      employee.errors = errors
      employee.isValid = errors.length === 0

      return employee as unknown as ParsedEmployee
    })
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setFileName(file.name)

    try {
      const text = await file.text()
      const parsed = parseCSV(text)
      setParsedData(parsed)

      const validCount = parsed.filter(e => e.isValid).length
      const invalidCount = parsed.length - validCount

      toast({
        title: "File Parsed",
        description: `Found ${parsed.length} rows: ${validCount} valid, ${invalidCount} with errors`,
      })
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to parse CSV file",
      })
    }
  }

  const handleImport = async () => {
    const validEmployees = parsedData.filter(e => e.isValid)
    if (validEmployees.length === 0) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No valid employees to import",
      })
      return
    }

    setImporting(true)
    const credentials: UserCredential[] = []

    try {
      let successCount = 0
      let errorCount = 0
      let userAccountCount = 0

      for (const emp of validEmployees) {
        try {
          const response = await fetch("/api/employees", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              ...emp,
              create_user_account: createUserAccounts && !!emp.email,
            }),
          })

          const data = await response.json()

          if (!response.ok) {
            errorCount++
            console.error(`Error creating ${emp.staff_id}:`, data.error)
            continue
          }

          successCount++

          // Collect credentials if user account was created
          if (data.user_credentials) {
            userAccountCount++
            credentials.push({
              email: data.user_credentials.email,
              temporary_password: data.user_credentials.temporary_password,
              name: `${emp.first_name} ${emp.last_name}`,
            })
          }
        } catch (err) {
          errorCount++
          console.error(`Error processing ${emp.staff_id}:`, err)
        }
      }

      // Show credentials dialog if any user accounts were created
      if (credentials.length > 0) {
        setCreatedCredentials(credentials)
        setShowCredentialsDialog(true)
        toast({
          title: "Import Complete",
          description: `Imported ${successCount} employees. ${userAccountCount} user accounts created.${errorCount > 0 ? ` ${errorCount} failed.` : ""}`,
        })
      } else {
        toast({
          title: "Import Complete",
          description: `Successfully imported ${successCount} employees.${errorCount > 0 ? ` ${errorCount} failed.` : ""}`,
        })
        if (successCount > 0) {
          router.push("/employees")
        }
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to import employees",
      })
    } finally {
      setImporting(false)
    }
  }

  const copyCredentials = async (index: number, credential: UserCredential) => {
    try {
      const text = `Email: ${credential.email}\nPassword: ${credential.temporary_password}`
      await navigator.clipboard.writeText(text)
      setCopiedIndex(index)
      setTimeout(() => setCopiedIndex(null), 2000)
    } catch (err) {
      console.error("Failed to copy:", err)
    }
  }

  const copyAllCredentials = async () => {
    try {
      const text = createdCredentials
        .map(c => `${c.name}\nEmail: ${c.email}\nPassword: ${c.temporary_password}`)
        .join("\n\n---\n\n")
      await navigator.clipboard.writeText(text)
      toast({
        title: "Copied",
        description: "All credentials copied to clipboard",
      })
    } catch (err) {
      console.error("Failed to copy:", err)
    }
  }

  const downloadTemplate = () => {
    const headers = expectedHeaders.join(",")
    const sampleRow = "HOP-001,John,Doe,Michael,Male,john@example.com,0712345678,2024-01-15,Software Engineer,A012345678Z,12345678,12345678,ABSA Bank,1234567890,100000,10000,5000,2000,15000"
    const csvContent = `${headers}\n${sampleRow}`

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "employee_import_template.csv"
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleDialogClose = () => {
    setShowCredentialsDialog(false)
    setCreatedCredentials([])
    router.push("/employees")
  }

  const validCount = parsedData.filter(e => e.isValid).length
  const invalidCount = parsedData.length - validCount
  const employeesWithEmail = parsedData.filter(e => e.isValid && e.email).length

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/employees">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Import Employees</h1>
          <p className="text-muted-foreground">
            Upload a CSV file to bulk import employees
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Upload CSV File</CardTitle>
            <CardDescription>
              Select a CSV file containing employee data
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <FileSpreadsheet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              {fileName ? (
                <div>
                  <p className="font-medium">{fileName}</p>
                  <p className="text-sm text-muted-foreground">Click to select a different file</p>
                </div>
              ) : (
                <div>
                  <p className="font-medium">Click to select a CSV file</p>
                  <p className="text-sm text-muted-foreground">or drag and drop</p>
                </div>
              )}
              <Input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            <Button
              variant="outline"
              className="w-full"
              onClick={downloadTemplate}
            >
              <Download className="mr-2 h-4 w-4" />
              Download Template
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Expected Format</CardTitle>
            <CardDescription>
              Your CSV should include these columns
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm space-y-2">
              <p className="font-medium">Required columns:</p>
              <ul className="list-disc list-inside text-muted-foreground">
                <li>staff_id</li>
                <li>first_name</li>
                <li>last_name</li>
                <li>employment_date (YYYY-MM-DD format)</li>
              </ul>
              <p className="font-medium mt-4">Optional columns:</p>
              <ul className="list-disc list-inside text-muted-foreground">
                <li>middle_name, gender, email, phone</li>
                <li>job_role, kra_pin, nssf_number, nhif_number</li>
                <li>bank_name, account_number</li>
                <li>basic_salary, car_allowance, meal_allowance</li>
                <li>telephone_allowance, housing_allowance</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

      {parsedData.length > 0 && (
        <>
          <div className="flex gap-4">
            {validCount > 0 && (
              <Alert className="flex-1">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertTitle>Valid Records</AlertTitle>
                <AlertDescription>
                  {validCount} employee(s) ready to import
                </AlertDescription>
              </Alert>
            )}
            {invalidCount > 0 && (
              <Alert variant="destructive" className="flex-1">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Invalid Records</AlertTitle>
                <AlertDescription>
                  {invalidCount} employee(s) have errors and will be skipped
                </AlertDescription>
              </Alert>
            )}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                User Account Options
              </CardTitle>
              <CardDescription>
                Configure user account creation for imported employees
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="create_user_accounts"
                  checked={createUserAccounts}
                  onCheckedChange={(checked) => setCreateUserAccounts(checked === true)}
                />
                <Label htmlFor="create_user_accounts" className="cursor-pointer">
                  Create user accounts for employees with email addresses
                </Label>
              </div>

              {createUserAccounts && employeesWithEmail > 0 && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {employeesWithEmail} employee(s) have email addresses and will receive user accounts.
                    Temporary passwords will be generated and displayed after import.
                  </AlertDescription>
                </Alert>
              )}

              {createUserAccounts && employeesWithEmail === 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    No employees in the CSV have email addresses. User accounts will not be created.
                    Add email addresses to the CSV to create user accounts.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Preview Data</CardTitle>
              <CardDescription>
                Review the parsed data before importing
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead>Staff ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Employment Date</TableHead>
                      <TableHead>Basic Salary</TableHead>
                      <TableHead>Errors</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedData.slice(0, 20).map((emp, index) => (
                      <TableRow key={index} className={!emp.isValid ? "bg-red-50" : ""}>
                        <TableCell>
                          {emp.isValid ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-red-600" />
                          )}
                        </TableCell>
                        <TableCell className="font-medium">{emp.staff_id || "-"}</TableCell>
                        <TableCell>
                          {emp.first_name} {emp.middle_name} {emp.last_name}
                        </TableCell>
                        <TableCell>{emp.email || "-"}</TableCell>
                        <TableCell>{emp.employment_date || "-"}</TableCell>
                        <TableCell>
                          {emp.basic_salary ? `KES ${emp.basic_salary.toLocaleString()}` : "-"}
                        </TableCell>
                        <TableCell className="text-red-600 text-sm">
                          {emp.errors.join(", ")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {parsedData.length > 20 && (
                  <p className="text-sm text-muted-foreground mt-4 text-center">
                    Showing first 20 of {parsedData.length} rows
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Button
              variant="outline"
              onClick={() => {
                setParsedData([])
                setFileName("")
                if (fileInputRef.current) fileInputRef.current.value = ""
              }}
            >
              Clear
            </Button>
            <Button
              onClick={handleImport}
              disabled={importing || validCount === 0}
            >
              <Upload className="mr-2 h-4 w-4" />
              {importing ? "Importing..." : `Import ${validCount} Employee(s)`}
            </Button>
          </div>
        </>
      )}

      {/* Credentials Dialog */}
      <Dialog open={showCredentialsDialog} onOpenChange={setShowCredentialsDialog}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Check className="h-5 w-5 text-green-600" />
              Import Complete - User Credentials
            </DialogTitle>
            <DialogDescription>
              {createdCredentials.length} user account(s) were created. Please share these credentials securely with the employees.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={copyAllCredentials}>
                <Copy className="mr-2 h-4 w-4" />
                Copy All Credentials
              </Button>
            </div>

            <div className="space-y-3">
              {createdCredentials.map((credential, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 border rounded-lg bg-muted/50"
                >
                  <div className="space-y-1">
                    <p className="font-medium">{credential.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Email: <span className="font-mono">{credential.email}</span>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Password: <span className="font-mono">{credential.temporary_password}</span>
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => copyCredentials(index, credential)}
                  >
                    {copiedIndex === index ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              ))}
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                These passwords will not be shown again. Make sure to copy them now and share securely with employees.
              </AlertDescription>
            </Alert>
          </div>

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
