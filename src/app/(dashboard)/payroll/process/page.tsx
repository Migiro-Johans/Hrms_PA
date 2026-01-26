"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
import { useToast } from "@/components/ui/use-toast"
import { Label } from "@/components/ui/label"
import { formatCurrency, getMonthName, getDaysInMonth } from "@/lib/utils"
import { calculatePayroll } from "@/lib/calculations"
import { MONTHS } from "@/lib/constants"
import type { Employee, PayrollCalculation } from "@/types"

interface EmployeeWithSalary extends Employee {
  salary_structures: Array<{
    basic_salary: number
    car_allowance: number
    meal_allowance: number
    telephone_allowance: number
    housing_allowance: number
  }>
  recurring_deductions: Array<{
    deduction_type: string
    amount: number
    is_active: boolean
  }>
}

interface PayrollPreview {
  employee: EmployeeWithSalary
  calculation: PayrollCalculation
}

export default function ProcessPayrollPage() {
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()

  const currentDate = new Date()
  const [month, setMonth] = useState(currentDate.getMonth() + 1)
  const [year, setYear] = useState(currentDate.getFullYear())
  const [loading, setLoading] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [employees, setEmployees] = useState<EmployeeWithSalary[]>([])
  const [preview, setPreview] = useState<PayrollPreview[]>([])
  const [companyId, setCompanyId] = useState<string | null>(null)

  useEffect(() => {
    loadEmployees()
  }, [])

  const loadEmployees = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile } = await supabase
      .from("users")
      .select("company_id")
      .eq("id", user?.id)
      .single()

    if (profile?.company_id) {
      setCompanyId(profile.company_id)

      const { data } = await supabase
        .from("employees")
        .select(`
          *,
          salary_structures(basic_salary, car_allowance, meal_allowance, telephone_allowance, housing_allowance),
          recurring_deductions(deduction_type, amount, is_active)
        `)
        .eq("company_id", profile.company_id)
        .eq("status", "active")

      setEmployees(data || [])
    }
  }

  const generatePreview = () => {
    setLoading(true)

    const calendarDays = getDaysInMonth(year, month)

    const previewData: PayrollPreview[] = employees
      .filter((emp) => emp.salary_structures?.length > 0)
      .map((employee) => {
        const salary = employee.salary_structures[0]

        // Get active recurring deductions
        const activeDeductions = employee.recurring_deductions?.filter(
          (d) => d.is_active
        ) || []

        const helb = activeDeductions.find(
          (d) => d.deduction_type === "HELB"
        )?.amount || 0

        const otherDeductions: Record<string, number> = {}
        activeDeductions
          .filter((d) => d.deduction_type !== "HELB")
          .forEach((d) => {
            otherDeductions[d.deduction_type] = d.amount
          })

        const calculation = calculatePayroll({
          basic_salary: salary.basic_salary,
          car_allowance: salary.car_allowance,
          meal_allowance: salary.meal_allowance,
          telephone_allowance: salary.telephone_allowance,
          housing_allowance: salary.housing_allowance,
          helb,
          other_deductions: otherDeductions,
          calendar_days: calendarDays,
          days_worked: calendarDays,
        })

        return { employee, calculation }
      })

    setPreview(previewData)
    setLoading(false)
  }

  const processPayroll = async () => {
    if (preview.length === 0) {
      toast({
        variant: "destructive",
        title: "No data",
        description: "Please generate preview first",
      })
      return
    }

    setProcessing(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()

      // Create payroll run
      const { data: payrollRun, error: runError } = await supabase
        .from("payroll_runs")
        .insert({
          company_id: companyId,
          month,
          year,
          status: "processing",
          processed_by: user?.id,
          processed_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (runError) {
        if (runError.code === "23505") {
          toast({
            variant: "destructive",
            title: "Duplicate",
            description: `Payroll for ${getMonthName(month)} ${year} already exists`,
          })
        } else {
          toast({
            variant: "destructive",
            title: "Error",
            description: runError.message,
          })
        }
        return
      }

      // Create payslips
      const calendarDays = getDaysInMonth(year, month)
      const payslips = preview.map(({ employee, calculation }) => ({
        payroll_run_id: payrollRun.id,
        employee_id: employee.id,
        basic_salary: calculation.basic_salary,
        car_allowance: calculation.car_allowance,
        meal_allowance: calculation.meal_allowance,
        telephone_allowance: calculation.telephone_allowance,
        housing_allowance: calculation.housing_allowance,
        other_earnings: calculation.other_earnings,
        gross_pay: calculation.gross_pay,
        calendar_days: calendarDays,
        days_worked: calendarDays,
        nssf_employee: calculation.nssf_employee,
        nssf_employer: calculation.nssf_employer,
        shif_employee: calculation.shif_employee,
        ahl_employee: calculation.ahl_employee,
        ahl_employer: calculation.ahl_employer,
        taxable_pay: calculation.taxable_pay,
        income_tax: calculation.income_tax,
        personal_relief: calculation.personal_relief,
        insurance_relief: calculation.insurance_relief,
        paye: calculation.paye,
        helb: calculation.helb,
        other_deductions: calculation.other_deductions,
        total_deductions: calculation.total_deductions,
        net_pay: calculation.net_pay,
        nita: calculation.nita,
        cost_to_company: calculation.cost_to_company,
      }))

      const { error: payslipError } = await supabase
        .from("payslips")
        .insert(payslips)

      if (payslipError) {
        toast({
          variant: "destructive",
          title: "Error",
          description: payslipError.message,
        })
        return
      }

      // Update status to hr_pending for approval workflow
      // Finance processes → HR approves → Management approves → Paid
      await supabase
        .from("payroll_runs")
        .update({ status: "hr_pending" })
        .eq("id", payrollRun.id)

      toast({
        title: "Payroll Submitted for Approval",
        description: `Payroll for ${getMonthName(month)} ${year} has been submitted for HR approval`,
      })

      router.push(`/payroll/${payrollRun.id}`)
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to process payroll",
      })
    } finally {
      setProcessing(false)
    }
  }

  const totals = preview.reduce(
    (acc, { calculation }) => ({
      gross: acc.gross + calculation.gross_pay,
      net: acc.net + calculation.net_pay,
      paye: acc.paye + calculation.paye,
      nssf: acc.nssf + calculation.nssf_employee,
      shif: acc.shif + calculation.shif_employee,
      ahl: acc.ahl + calculation.ahl_employee,
    }),
    { gross: 0, net: 0, paye: 0, nssf: 0, shif: 0, ahl: 0 }
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Process Payroll</h1>
        <p className="text-muted-foreground">
          Calculate and process monthly payroll for all employees
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Select Period</CardTitle>
          <CardDescription>Choose the month and year for payroll processing</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="space-y-2">
              <Label>Month</Label>
              <Select
                value={month.toString()}
                onValueChange={(value) => setMonth(parseInt(value))}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m, i) => (
                    <SelectItem key={m} value={(i + 1).toString()}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Year</Label>
              <Select
                value={year.toString()}
                onValueChange={(value) => setYear(parseInt(value))}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[2023, 2024, 2025, 2026].map((y) => (
                    <SelectItem key={y} value={y.toString()}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={generatePreview} disabled={loading}>
              {loading ? "Generating..." : "Generate Preview"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {preview.length > 0 && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Payroll Summary</CardTitle>
              <CardDescription>
                {getMonthName(month)} {year} - {preview.length} employees
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Total Gross</p>
                  <p className="text-lg font-semibold">{formatCurrency(totals.gross)}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Total NSSF</p>
                  <p className="text-lg font-semibold">{formatCurrency(totals.nssf)}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Total SHIF</p>
                  <p className="text-lg font-semibold">{formatCurrency(totals.shif)}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Total AHL</p>
                  <p className="text-lg font-semibold">{formatCurrency(totals.ahl)}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Total PAYE</p>
                  <p className="text-lg font-semibold">{formatCurrency(totals.paye)}</p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Total Net</p>
                  <p className="text-lg font-semibold text-green-700">{formatCurrency(totals.net)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Payroll Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead className="text-right">Gross</TableHead>
                      <TableHead className="text-right">NSSF</TableHead>
                      <TableHead className="text-right">SHIF</TableHead>
                      <TableHead className="text-right">AHL</TableHead>
                      <TableHead className="text-right">PAYE</TableHead>
                      <TableHead className="text-right">Net Pay</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.map(({ employee, calculation }) => (
                      <TableRow key={employee.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {employee.first_name} {employee.last_name}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {employee.staff_id}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(calculation.gross_pay)}
                        </TableCell>
                        <TableCell className="text-right text-red-600">
                          ({formatCurrency(calculation.nssf_employee)})
                        </TableCell>
                        <TableCell className="text-right text-red-600">
                          ({formatCurrency(calculation.shif_employee)})
                        </TableCell>
                        <TableCell className="text-right text-red-600">
                          ({formatCurrency(calculation.ahl_employee)})
                        </TableCell>
                        <TableCell className="text-right text-red-600">
                          ({formatCurrency(calculation.paye)})
                        </TableCell>
                        <TableCell className="text-right font-semibold text-green-600">
                          {formatCurrency(calculation.net_pay)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Button variant="outline" onClick={() => router.push("/payroll")}>
              Cancel
            </Button>
            <Button onClick={processPayroll} disabled={processing}>
              {processing ? "Submitting..." : "Submit for Approval"}
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
