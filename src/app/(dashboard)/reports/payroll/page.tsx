import Link from "next/link"
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
import { Download, FileSpreadsheet, Calendar, Users, DollarSign } from "lucide-react"

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
]

function getStatusBadgeVariant(status: string) {
  switch (status) {
    case 'approved':
    case 'paid':
      return 'success'
    case 'finance_pending':
    case 'mgmt_pending':
    case 'processing':
      return 'warning'
    case 'finance_rejected':
    case 'mgmt_rejected':
      return 'destructive'
    default:
      return 'secondary'
  }
}

function formatStatus(status: string) {
  return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}

export default async function PayrollReportsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from("users")
    .select("company_id, role")
    .eq("id", user?.id)
    .single()

  // Get all payroll runs for the company
  const { data: payrollRuns } = await supabase
    .from("payroll_runs")
    .select(`
      id, month, year, status, processed_at, approved_at, paid_at, notes,
      payslips(id, gross_pay, net_pay, paye)
    `)
    .eq("company_id", profile?.company_id)
    .order("year", { ascending: false })
    .order("month", { ascending: false })

  // Calculate totals for each payroll run
  const payrollWithTotals = (payrollRuns || []).map(run => {
    const payslips = run.payslips || []
    return {
      ...run,
      employee_count: payslips.length,
      total_gross: payslips.reduce((sum: number, p: any) => sum + (p.gross_pay || 0), 0),
      total_net: payslips.reduce((sum: number, p: any) => sum + (p.net_pay || 0), 0),
      total_paye: payslips.reduce((sum: number, p: any) => sum + (p.paye || 0), 0),
    }
  })

  // Get summary stats
  const currentYear = new Date().getFullYear()
  const currentYearRuns = payrollWithTotals.filter(r => r.year === currentYear)
  const yearlyTotalGross = currentYearRuns.reduce((sum, r) => sum + r.total_gross, 0)
  const yearlyTotalNet = currentYearRuns.reduce((sum, r) => sum + r.total_net, 0)
  const yearlyTotalPaye = currentYearRuns.reduce((sum, r) => sum + r.total_paye, 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Payroll Summary Reports</h1>
        <p className="text-muted-foreground">
          View monthly and annual payroll summaries
        </p>
      </div>

      {/* Year-to-Date Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">YTD Gross Pay</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(yearlyTotalGross)}</div>
            <p className="text-xs text-muted-foreground">{currentYear} total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">YTD Net Pay</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(yearlyTotalNet)}</div>
            <p className="text-xs text-muted-foreground">{currentYear} total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">YTD PAYE</CardTitle>
            <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(yearlyTotalPaye)}</div>
            <p className="text-xs text-muted-foreground">{currentYear} total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Payroll Runs</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currentYearRuns.length}</div>
            <p className="text-xs text-muted-foreground">{currentYear} processed</p>
          </CardContent>
        </Card>
      </div>

      {/* Payroll Runs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Payroll History</CardTitle>
          <CardDescription>
            All payroll runs with summary totals
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Period</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Employees</TableHead>
                <TableHead className="text-right">Gross Pay</TableHead>
                <TableHead className="text-right">Net Pay</TableHead>
                <TableHead className="text-right">PAYE</TableHead>
                <TableHead className="text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payrollWithTotals.map((run) => (
                <TableRow key={run.id}>
                  <TableCell className="font-medium">
                    {MONTHS[run.month - 1]} {run.year}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(run.status) as any}>
                      {formatStatus(run.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Users className="h-3 w-3 text-muted-foreground" />
                      {run.employee_count}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">{formatCurrency(run.total_gross)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(run.total_net)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(run.total_paye)}</TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Link href={`/payroll/${run.id}`}>
                        <Button variant="outline" size="sm">
                          View
                        </Button>
                      </Link>
                      {(run.status === 'approved' || run.status === 'paid') && (
                        <Link href={`/api/reports/payroll/${run.id}/summary`} target="_blank">
                          <Button variant="outline" size="sm">
                            <Download className="h-3 w-3 mr-1" />
                            Export
                          </Button>
                        </Link>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {(!payrollRuns || payrollRuns.length === 0) && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <p className="text-muted-foreground">No payroll runs found</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Annual Summary by Year */}
      {payrollWithTotals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Annual Summary</CardTitle>
            <CardDescription>
              Yearly payroll totals breakdown
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Year</TableHead>
                  <TableHead className="text-right">Payroll Runs</TableHead>
                  <TableHead className="text-right">Total Gross Pay</TableHead>
                  <TableHead className="text-right">Total Net Pay</TableHead>
                  <TableHead className="text-right">Total PAYE</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from(new Set(payrollWithTotals.map(r => r.year)))
                  .sort((a, b) => b - a)
                  .map(year => {
                    const yearRuns = payrollWithTotals.filter(r => r.year === year)
                    const totalGross = yearRuns.reduce((sum, r) => sum + r.total_gross, 0)
                    const totalNet = yearRuns.reduce((sum, r) => sum + r.total_net, 0)
                    const totalPaye = yearRuns.reduce((sum, r) => sum + r.total_paye, 0)
                    return (
                      <TableRow key={year}>
                        <TableCell className="font-medium">{year}</TableCell>
                        <TableCell className="text-right">{yearRuns.length}</TableCell>
                        <TableCell className="text-right">{formatCurrency(totalGross)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(totalNet)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(totalPaye)}</TableCell>
                      </TableRow>
                    )
                  })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
