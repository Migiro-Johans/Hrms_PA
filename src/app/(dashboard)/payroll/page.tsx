import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatCurrency, getMonthName } from "@/lib/utils"
import { Plus, Eye } from "lucide-react"

export default async function PayrollPage() {
  const supabase = await createClient()

  // Get user's company
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from("users")
    .select("company_id")
    .eq("id", user?.id)
    .single()

  // Get payroll runs with summary
  const { data: payrollRuns } = await supabase
    .from("payroll_runs")
    .select(`
      *,
      payslips(gross_pay, net_pay, paye)
    `)
    .eq("company_id", profile?.company_id)
    .order("year", { ascending: false })
    .order("month", { ascending: false })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Payroll</h1>
          <p className="text-muted-foreground">
            Manage monthly payroll runs
          </p>
        </div>
        <Link href="/payroll/process">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Process Payroll
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payroll History</CardTitle>
          <CardDescription>
            All payroll runs for your company
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Period</TableHead>
                <TableHead>Employees</TableHead>
                <TableHead>Total Gross</TableHead>
                <TableHead>Total Net</TableHead>
                <TableHead>Total PAYE</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payrollRuns?.map((run) => {
                const totalGross = run.payslips?.reduce(
                  (sum: number, p: { gross_pay: number }) => sum + (p.gross_pay || 0),
                  0
                ) || 0
                const totalNet = run.payslips?.reduce(
                  (sum: number, p: { net_pay: number }) => sum + (p.net_pay || 0),
                  0
                ) || 0
                const totalPaye = run.payslips?.reduce(
                  (sum: number, p: { paye: number }) => sum + (p.paye || 0),
                  0
                ) || 0

                return (
                  <TableRow key={run.id}>
                    <TableCell className="font-medium">
                      {getMonthName(run.month)} {run.year}
                    </TableCell>
                    <TableCell>{run.payslips?.length || 0}</TableCell>
                    <TableCell>{formatCurrency(totalGross)}</TableCell>
                    <TableCell>{formatCurrency(totalNet)}</TableCell>
                    <TableCell>{formatCurrency(totalPaye)}</TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                          run.status === "paid"
                            ? "bg-green-100 text-green-700"
                            : run.status === "approved"
                            ? "bg-blue-100 text-blue-700"
                            : run.status === "processing"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {run.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/payroll/${run.id}`}>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                )
              })}
              {(!payrollRuns || payrollRuns.length === 0) && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <p className="text-muted-foreground">No payroll runs yet</p>
                    <Link href="/payroll/process">
                      <Button variant="link">Process your first payroll</Button>
                    </Link>
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
