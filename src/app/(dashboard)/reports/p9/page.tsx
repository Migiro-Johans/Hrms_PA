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
import { formatCurrency } from "@/lib/utils"
import { Download, FileText } from "lucide-react"

export default async function P9ReportsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from("users")
    .select("company_id, role")
    .eq("id", user?.id)
    .single()

  // Get employees with P9 data
  const { data: employees } = await supabase
    .from("employees")
    .select(`
      id, first_name, last_name, middle_name, staff_id, kra_pin,
      p9_records(year, paye_tax, total_gross_pay)
    `)
    .eq("company_id", profile?.company_id)
    .eq("status", "active")

  // Group P9 data by year
  const currentYear = new Date().getFullYear()
  const years = [currentYear, currentYear - 1, currentYear - 2]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">P9 Tax Forms</h1>
        <p className="text-muted-foreground">
          Generate and download P9 tax deduction cards for employees
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Employee P9 Forms</CardTitle>
          <CardDescription>
            Select an employee to generate their P9 tax deduction card
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Staff ID</TableHead>
                <TableHead>Employee Name</TableHead>
                <TableHead>KRA PIN</TableHead>
                {years.map((year) => (
                  <TableHead key={year} className="text-center">
                    {year}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees?.map((employee) => {
                const p9ByYear: Record<number, { totalPaye: number; totalGross: number }> = {}
                employee.p9_records?.forEach((record: { year: number; paye_tax: number; total_gross_pay: number }) => {
                  if (!p9ByYear[record.year]) {
                    p9ByYear[record.year] = { totalPaye: 0, totalGross: 0 }
                  }
                  p9ByYear[record.year].totalPaye += record.paye_tax || 0
                  p9ByYear[record.year].totalGross += record.total_gross_pay || 0
                })

                return (
                  <TableRow key={employee.id}>
                    <TableCell className="font-medium">{employee.staff_id}</TableCell>
                    <TableCell>
                      {employee.first_name} {employee.middle_name} {employee.last_name}
                    </TableCell>
                    <TableCell>{employee.kra_pin || "-"}</TableCell>
                    {years.map((year) => (
                      <TableCell key={year} className="text-center">
                        {p9ByYear[year] ? (
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-xs text-muted-foreground">
                              PAYE: {formatCurrency(p9ByYear[year].totalPaye)}
                            </span>
                            <Link href={`/api/reports/p9/${employee.id}?year=${year}`} target="_blank">
                              <Button variant="outline" size="sm">
                                <Download className="h-3 w-3 mr-1" />
                                P9
                              </Button>
                            </Link>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                )
              })}
              {(!employees || employees.length === 0) && (
                <TableRow>
                  <TableCell colSpan={3 + years.length} className="text-center py-8">
                    <p className="text-muted-foreground">No employees found</p>
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
