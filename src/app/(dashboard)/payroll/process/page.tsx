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
import { Input } from "@/components/ui/input"
import { formatCurrency, getMonthName, getDaysInMonth } from "@/lib/utils"
import { calculatePayroll } from "@/lib/calculations"
import { MONTHS } from "@/lib/constants"
import { createApprovalRequestAction } from "@/lib/actions/workflow"
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

type PayrollRunDeduction = {
  employee_id: string
  deduction_type: string
  label: string | null
  amount: number
}

type PayrollRunRecord = {
  id: string
  company_id: string
  month: number
  year: number
  status: string
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
  const [employeeId, setEmployeeId] = useState<string | null>(null)
  const [manualDeductions, setManualDeductions] = useState<Record<string, PayrollRunDeduction[]>>({})
  const [payrollRun, setPayrollRun] = useState<PayrollRunRecord | null>(null)

  useEffect(() => {
    loadEmployees()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadEmployees = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile } = await supabase
      .from("users")
      .select("company_id, employee_id")
      .eq("id", user?.id)
      .single()

    if (profile?.company_id) {
      setCompanyId(profile.company_id)
      setEmployeeId(profile.employee_id)

      // Ensure we have a draft payroll run for this period so Finance deductions can be saved against it
      const { data: existingRun } = await supabase
        .from("payroll_runs")
        .select("id, company_id, month, year, status")
        .eq("company_id", profile.company_id)
        .eq("month", month)
        .eq("year", year)
        .maybeSingle()

      if (existingRun?.id) {
        setPayrollRun(existingRun)
      } else {
        const { data: { user } } = await supabase.auth.getUser()
        const { data: newRun } = await supabase
          .from("payroll_runs")
          .insert({
            company_id: profile.company_id,
            month,
            year,
            status: "draft",
            processed_by: user?.id,
          })
          .select("id, company_id, month, year, status")
          .single()
        if (newRun?.id) setPayrollRun(newRun)
      }

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

      // Load saved finance deductions for this payroll run
      const effectiveRunId = (existingRun?.id || payrollRun?.id) as string | undefined
      if (effectiveRunId) {
        const { data: deductions } = await supabase
          .from("payroll_employee_deductions")
          .select("employee_id, deduction_type, label, amount")
          .eq("payroll_run_id", effectiveRunId)

        const map: Record<string, PayrollRunDeduction[]> = {}
        ;(deductions || []).forEach((d) => {
          if (!map[d.employee_id]) map[d.employee_id] = []
          map[d.employee_id].push(d)
        })
        setManualDeductions(map)
      }
    }
  }

  // When month/year changes, reload employees and create/load the draft run
  useEffect(() => {
    loadEmployees()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, year])

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

        // Merge in finance-added one-off deductions for this payroll run/period (entered below)
        const extras = manualDeductions[employee.id] || []
        let extraHelb = 0
        extras.forEach((d) => {
          if (d.deduction_type === "HELB") {
            extraHelb += d.amount
            return
          }
          const key = (d.label || d.deduction_type).trim()
          otherDeductions[key] = (otherDeductions[key] || 0) + d.amount
        })

        const calculation = calculatePayroll({
          basic_salary: salary.basic_salary,
          car_allowance: salary.car_allowance,
          meal_allowance: salary.meal_allowance,
          telephone_allowance: salary.telephone_allowance,
          housing_allowance: salary.housing_allowance,
          helb: helb + extraHelb,
          other_deductions: otherDeductions,
          calendar_days: calendarDays,
          days_worked: calendarDays,
        })

        return { employee, calculation }
      })

    setPreview(previewData)
    setLoading(false)
  }

  const setEmployeeDeduction = (
    employeeId: string,
    index: number,
    patch: Partial<PayrollRunDeduction>
  ) => {
    setManualDeductions((prev) => {
      const current = prev[employeeId] || []
      const next = [...current]
      next[index] = { ...next[index], ...patch }
      return { ...prev, [employeeId]: next }
    })
  }

  const addEmployeeDeduction = (employeeId: string) => {
    setManualDeductions((prev) => {
      const current = prev[employeeId] || []
      return {
        ...prev,
        [employeeId]: [
          ...current,
          { employee_id: employeeId, deduction_type: "LOAN", label: "", amount: 0 },
        ],
      }
    })
  }

  const removeEmployeeDeduction = (employeeId: string, index: number) => {
    setManualDeductions((prev) => {
      const current = prev[employeeId] || []
      const next = current.filter((_, i) => i !== index)
      return { ...prev, [employeeId]: next }
    })
  }

  const saveFinanceDeductions = async () => {
    if (!payrollRun?.id) {
      toast({ variant: "destructive", title: "Missing payroll run", description: "Draft payroll run not ready" })
      return
    }

    // Flatten and validate
    const rows: Array<{
      payroll_run_id: string
      employee_id: string
      deduction_type: string
      label: string | null
      amount: number
    }> = []

    Object.entries(manualDeductions).forEach(([employeeId, deducs]) => {
      deducs
        .filter((d) => (d.amount || 0) > 0)
        .forEach((d) => {
          rows.push({
            payroll_run_id: payrollRun.id,
            employee_id: employeeId,
            deduction_type: d.deduction_type,
            label: (d.label || "").trim() || null,
            amount: d.amount,
          })
        })
    })

    // Replace-all strategy to keep it simple and avoid partial mismatches
    const { error: delErr } = await supabase
      .from("payroll_employee_deductions")
      .delete()
      .eq("payroll_run_id", payrollRun.id)

    if (delErr) {
      toast({ variant: "destructive", title: "Failed to save", description: delErr.message })
      return
    }

    if (rows.length > 0) {
      const { error: insErr } = await supabase
        .from("payroll_employee_deductions")
        .insert(rows)
      if (insErr) {
        toast({ variant: "destructive", title: "Failed to save", description: insErr.message })
        return
      }
    }

    toast({ title: "Saved", description: "Finance deductions saved for this payroll run" })
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

      // Ensure deductions are saved before processing
      await saveFinanceDeductions()

      if (!payrollRun?.id) {
        toast({ variant: "destructive", title: "Missing payroll run", description: "Draft payroll run not ready" })
        return
      }

      // Mark payroll run as processing
      const { error: runError } = await supabase
        .from("payroll_runs")
        .update({
          status: "processing",
          processed_by: user?.id,
          processed_at: new Date().toISOString(),
        })
        .eq("id", payrollRun.id)

      if (runError) {
        toast({ variant: "destructive", title: "Error", description: runError.message })
        return
      }

      // Delete existing payslips for this payroll run before creating new ones
      // This allows re-processing payroll if needed
      const { error: deleteError } = await supabase
        .from("payslips")
        .delete()
        .eq("payroll_run_id", payrollRun.id)

      if (deleteError) {
        toast({
          variant: "destructive",
          title: "Error",
          description: `Failed to clear existing payslips: ${deleteError.message}`,
        })
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

      // Update status to finance_pending for approval workflow
      // HR processes → Finance reconciles → Management approves → Paid
      await supabase
        .from("payroll_runs")
        .update({ status: "finance_pending" })
        .eq("id", payrollRun.id)

      // Create approval request for Finance team
      if (companyId && employeeId) {
        try {
          await createApprovalRequestAction({
            companyId,
            entityType: "payroll",
            entityId: payrollRun.id,
            requesterId: employeeId,
          })
        } catch (error) {
          console.error("Failed to create approval request:", error)
          // Don't fail the whole process if approval request creation fails
        }
      }

      toast({
        title: "Payroll Submitted for Reconciliation",
        description: `Payroll for ${getMonthName(month)} ${year} has been submitted for Finance reconciliation`,
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
              <CardTitle>Finance Deductions (One-off)</CardTitle>
              <CardDescription>
                Add employee-specific deductions for this payroll period before submitting. These will be included in net pay.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between gap-4 mb-4">
                <div className="text-sm text-muted-foreground">
                  Draft payroll run: <span className="font-medium">{payrollRun?.id ? "Ready" : "Loading..."}</span>
                </div>
                <Button variant="outline" onClick={saveFinanceDeductions} disabled={!payrollRun?.id}>
                  Save deductions
                </Button>
              </div>
              <div className="space-y-6">
                {employees
                  .filter((emp) => emp.salary_structures?.length > 0)
                  .map((emp) => (
                    <div key={emp.id} className="rounded-lg border p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <div className="font-medium">
                            {emp.first_name} {emp.last_name}
                          </div>
                          <div className="text-sm text-muted-foreground">{emp.staff_id}</div>
                        </div>
                        <Button variant="outline" onClick={() => addEmployeeDeduction(emp.id)}>
                          Add deduction
                        </Button>
                      </div>

                      {(manualDeductions[emp.id] || []).length > 0 && (
                        <div className="mt-4 space-y-3">
                          {(manualDeductions[emp.id] || []).map((d, idx) => (
                            <div
                              key={`${emp.id}-${idx}`}
                              className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end"
                            >
                              <div className="space-y-2">
                                <Label>Type</Label>
                                <Select
                                  value={d.deduction_type}
                                  onValueChange={(value) =>
                                    setEmployeeDeduction(emp.id, idx, {
                                      deduction_type: value,
                                      // Suggest a label for known types
                                      label:
                                        value === "HELB"
                                          ? "HELB"
                                          : value === "WELFARE"
                                            ? "Welfare"
                                            : value === "LOAN"
                                              ? "Loan"
                                              : d.label,
                                    })
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="HELB">HELB</SelectItem>
                                    <SelectItem value="LOAN">Company Loan</SelectItem>
                                    <SelectItem value="WELFARE">Welfare</SelectItem>
                                    <SelectItem value="OTHER">Other</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="space-y-2 md:col-span-2">
                                <Label>Label</Label>
                                <Input
                                  placeholder="e.g. Sacco loan"
                                  value={d.label || ""}
                                  onChange={(e) =>
                                    setEmployeeDeduction(emp.id, idx, { label: e.target.value })
                                  }
                                />
                              </div>

                              <div className="space-y-2">
                                <Label>Amount (KES)</Label>
                                <Input
                                  type="number"
                                  min={0}
                                  step={0.01}
                                  value={Number.isFinite(d.amount) ? d.amount : 0}
                                  onChange={(e) =>
                                    setEmployeeDeduction(emp.id, idx, {
                                      amount: Number(e.target.value || 0),
                                    })
                                }
                                />
                              </div>

                              <div className="flex justify-end">
                                <Button
                                  variant="outline"
                                  onClick={() => removeEmployeeDeduction(emp.id, idx)}
                                >
                                  Remove
                                </Button>
                              </div>
                            </div>
                          ))}
                          <p className="text-sm text-muted-foreground">
                            After updating deductions, click “Generate Preview” again to refresh totals.
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>

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
