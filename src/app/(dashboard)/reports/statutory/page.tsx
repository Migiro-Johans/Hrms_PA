import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/lib/utils"
import { Download, FileText, Building2, Shield, Landmark, GraduationCap } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
]

interface StatutoryTotals {
  nssf_employee: number
  nssf_employer: number
  shif_employee: number
  ahl_employee: number
  ahl_employer: number
  paye: number
  helb: number
  nita: number
}

export default async function StatutoryReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from("users")
    .select("company_id, role")
    .eq("id", user?.id)
    .single()

  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1
  const selectedYear = params.year ? parseInt(params.year) : currentYear
  const selectedMonth = params.month ? parseInt(params.month) : currentMonth

  // Get payroll run for selected period
  const { data: payrollRun } = await supabase
    .from("payroll_runs")
    .select(`
      id, month, year, status,
      payslips(
        id, employee_id,
        nssf_employee, nssf_employer,
        shif_employee,
        ahl_employee, ahl_employer,
        paye, helb, nita,
        employee:employees(id, staff_id, first_name, last_name, nssf_number, kra_pin)
      )
    `)
    .eq("company_id", profile?.company_id)
    .eq("year", selectedYear)
    .eq("month", selectedMonth)
    .single()

  // Calculate totals
  const totals: StatutoryTotals = {
    nssf_employee: 0,
    nssf_employer: 0,
    shif_employee: 0,
    ahl_employee: 0,
    ahl_employer: 0,
    paye: 0,
    helb: 0,
    nita: 0,
  }

  const payslips = payrollRun?.payslips || []
  payslips.forEach((p: any) => {
    totals.nssf_employee += p.nssf_employee || 0
    totals.nssf_employer += p.nssf_employer || 0
    totals.shif_employee += p.shif_employee || 0
    totals.ahl_employee += p.ahl_employee || 0
    totals.ahl_employer += p.ahl_employer || 0
    totals.paye += p.paye || 0
    totals.helb += p.helb || 0
    totals.nita += p.nita || 0
  })

  // Get available years from payroll runs
  const { data: availableRuns } = await supabase
    .from("payroll_runs")
    .select("year, month")
    .eq("company_id", profile?.company_id)
    .order("year", { ascending: false })
    .order("month", { ascending: false })

  const availableYears = Array.from(new Set((availableRuns || []).map(r => r.year))).sort((a, b) => b - a)
  if (!availableYears.includes(currentYear)) {
    availableYears.unshift(currentYear)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Statutory Reports</h1>
          <p className="text-muted-foreground">
            NSSF, SHIF, PAYE, and other statutory deduction reports
          </p>
        </div>
        <div className="flex items-center gap-2">
          <form className="flex items-center gap-2">
            <Select name="month" defaultValue={selectedMonth.toString()}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Month" />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map((month, idx) => (
                  <SelectItem key={idx} value={(idx + 1).toString()}>
                    {month}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select name="year" defaultValue={selectedYear.toString()}>
              <SelectTrigger className="w-[100px]">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                {availableYears.map(year => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="submit" variant="outline">Filter</Button>
          </form>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">NSSF Total</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totals.nssf_employee + totals.nssf_employer)}</div>
            <p className="text-xs text-muted-foreground">
              Employee: {formatCurrency(totals.nssf_employee)} | Employer: {formatCurrency(totals.nssf_employer)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">SHIF Total</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totals.shif_employee)}</div>
            <p className="text-xs text-muted-foreground">Social Health Insurance Fund</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">PAYE Total</CardTitle>
            <Landmark className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totals.paye)}</div>
            <p className="text-xs text-muted-foreground">Pay As You Earn (KRA)</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Housing Levy</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totals.ahl_employee + totals.ahl_employer)}</div>
            <p className="text-xs text-muted-foreground">
              Employee: {formatCurrency(totals.ahl_employee)} | Employer: {formatCurrency(totals.ahl_employer)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Additional Statutory Items */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">HELB Deductions</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totals.helb)}</div>
            <p className="text-xs text-muted-foreground">Higher Education Loans Board</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">NITA Levy</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totals.nita)}</div>
            <p className="text-xs text-muted-foreground">National Industrial Training Authority</p>
          </CardContent>
        </Card>
      </div>

      {/* Period Info */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>
                {MONTHS[selectedMonth - 1]} {selectedYear} Statutory Breakdown
              </CardTitle>
              <div className="mt-1">
                {payrollRun ? (
                  <Badge variant={payrollRun.status === 'paid' || payrollRun.status === 'approved' ? 'success' : 'secondary'}>
                    {payrollRun.status.replace(/_/g, ' ').toUpperCase()}
                  </Badge>
                ) : (
                  <span className="text-sm text-muted-foreground">No payroll run for this period</span>
                )}
              </div>
            </div>
            {payrollRun && (payrollRun.status === 'approved' || payrollRun.status === 'paid') && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <Download className="h-3 w-3 mr-1" />
                  NSSF Report
                </Button>
                <Button variant="outline" size="sm">
                  <Download className="h-3 w-3 mr-1" />
                  PAYE Report
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {payslips.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Staff ID</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead>NSSF No.</TableHead>
                  <TableHead>KRA PIN</TableHead>
                  <TableHead className="text-right">NSSF</TableHead>
                  <TableHead className="text-right">SHIF</TableHead>
                  <TableHead className="text-right">Housing</TableHead>
                  <TableHead className="text-right">PAYE</TableHead>
                  <TableHead className="text-right">HELB</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payslips.map((payslip: any) => (
                  <TableRow key={payslip.id}>
                    <TableCell className="font-medium">{payslip.employee?.staff_id}</TableCell>
                    <TableCell>
                      {payslip.employee?.first_name} {payslip.employee?.last_name}
                    </TableCell>
                    <TableCell>{payslip.employee?.nssf_number || '-'}</TableCell>
                    <TableCell>{payslip.employee?.kra_pin || '-'}</TableCell>
                    <TableCell className="text-right">{formatCurrency(payslip.nssf_employee)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(payslip.shif_employee)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(payslip.ahl_employee)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(payslip.paye)}</TableCell>
                    <TableCell className="text-right">{payslip.helb > 0 ? formatCurrency(payslip.helb) : '-'}</TableCell>
                  </TableRow>
                ))}
                {/* Totals Row */}
                <TableRow className="bg-muted/50 font-medium">
                  <TableCell colSpan={4} className="text-right">Total</TableCell>
                  <TableCell className="text-right">{formatCurrency(totals.nssf_employee)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(totals.shif_employee)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(totals.ahl_employee)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(totals.paye)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(totals.helb)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No payroll data for this period</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
