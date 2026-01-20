import Link from "next/link"
import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { formatCurrency, getMonthName } from "@/lib/utils"
import { Download, ArrowLeft } from "lucide-react"

export default async function PayslipDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = await createClient()

  const { data: payslip } = await supabase
    .from("payslips")
    .select(`
      *,
      employees(
        first_name, last_name, middle_name, staff_id, job_role,
        bank_name, account_number, kra_pin, nssf_number, nhif_number
      ),
      payroll_runs(month, year, status, companies(name, address, email, phone))
    `)
    .eq("id", params.id)
    .single()

  if (!payslip) {
    notFound()
  }

  const employee = payslip.employees
  const payrollRun = payslip.payroll_runs
  const company = payrollRun?.companies

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/payslips">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Payslip - {getMonthName(payrollRun?.month || 1)} {payrollRun?.year}
            </h1>
            <p className="text-muted-foreground">
              {employee?.first_name} {employee?.middle_name} {employee?.last_name}
            </p>
          </div>
        </div>
        <Link href={`/api/payslips/${params.id}/pdf`} target="_blank">
          <Button>
            <Download className="mr-2 h-4 w-4" />
            Download PDF
          </Button>
        </Link>
      </div>

      <div className="bg-white border rounded-lg p-8 max-w-4xl mx-auto">
        {/* Company Header */}
        <div className="text-center mb-6 border-b pb-4">
          <h2 className="text-xl font-bold">{company?.name || "Company Name"}</h2>
          <p className="text-sm text-gray-600">{company?.address}</p>
          <p className="text-sm text-gray-600">{company?.email} | {company?.phone}</p>
        </div>

        <h3 className="text-lg font-semibold text-center mb-6">
          Payslip for {getMonthName(payrollRun?.month || 1)} {payrollRun?.year}
        </h3>

        {/* Employee Info */}
        <div className="grid grid-cols-2 gap-8 mb-6">
          <div>
            <h4 className="font-semibold text-sm text-gray-500 mb-2">EMPLOYEE BIO DATA</h4>
            <table className="text-sm">
              <tbody>
                <tr>
                  <td className="text-gray-600 pr-4 py-1">Name</td>
                  <td className="font-medium">{employee?.first_name} {employee?.middle_name} {employee?.last_name}</td>
                </tr>
                <tr>
                  <td className="text-gray-600 pr-4 py-1">Staff ID</td>
                  <td className="font-medium">{employee?.staff_id}</td>
                </tr>
                <tr>
                  <td className="text-gray-600 pr-4 py-1">Job Role</td>
                  <td className="font-medium">{employee?.job_role || "-"}</td>
                </tr>
                <tr>
                  <td className="text-gray-600 pr-4 py-1">KRA PIN</td>
                  <td className="font-medium">{employee?.kra_pin || "-"}</td>
                </tr>
                <tr>
                  <td className="text-gray-600 pr-4 py-1">Bank</td>
                  <td className="font-medium">{employee?.bank_name || "-"}</td>
                </tr>
                <tr>
                  <td className="text-gray-600 pr-4 py-1">Account</td>
                  <td className="font-medium">{employee?.account_number || "-"}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div>
            {/* Earnings */}
            <h4 className="font-semibold text-sm text-gray-500 mb-2">EARNINGS</h4>
            <table className="text-sm w-full">
              <tbody>
                <tr className="border-b">
                  <td className="py-1">Basic Salary</td>
                  <td className="text-right">{formatCurrency(payslip.basic_salary)}</td>
                </tr>
                {payslip.car_allowance > 0 && (
                  <tr className="border-b">
                    <td className="py-1">Car Allowance</td>
                    <td className="text-right">{formatCurrency(payslip.car_allowance)}</td>
                  </tr>
                )}
                {payslip.meal_allowance > 0 && (
                  <tr className="border-b">
                    <td className="py-1">Meal Allowance</td>
                    <td className="text-right">{formatCurrency(payslip.meal_allowance)}</td>
                  </tr>
                )}
                {payslip.telephone_allowance > 0 && (
                  <tr className="border-b">
                    <td className="py-1">Telephone</td>
                    <td className="text-right">{formatCurrency(payslip.telephone_allowance)}</td>
                  </tr>
                )}
                {payslip.housing_allowance > 0 && (
                  <tr className="border-b">
                    <td className="py-1">Housing</td>
                    <td className="text-right">{formatCurrency(payslip.housing_allowance)}</td>
                  </tr>
                )}
                <tr className="font-semibold bg-gray-50">
                  <td className="py-2">Gross Pay</td>
                  <td className="text-right">{formatCurrency(payslip.gross_pay)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Deductions */}
        <div className="grid grid-cols-2 gap-8 mb-6">
          <div>
            <h4 className="font-semibold text-sm text-gray-500 mb-2">STATUTORY DEDUCTIONS</h4>
            <table className="text-sm w-full">
              <tbody>
                <tr className="border-b">
                  <td className="py-1">NSSF</td>
                  <td className="text-right text-red-600">({formatCurrency(payslip.nssf_employee)})</td>
                </tr>
                <tr className="border-b">
                  <td className="py-1">SHIF (SHA)</td>
                  <td className="text-right text-red-600">({formatCurrency(payslip.shif_employee)})</td>
                </tr>
                <tr className="border-b">
                  <td className="py-1">Affordable Housing Levy</td>
                  <td className="text-right text-red-600">({formatCurrency(payslip.ahl_employee)})</td>
                </tr>
                <tr className="border-b">
                  <td className="py-1">PAYE</td>
                  <td className="text-right text-red-600">({formatCurrency(payslip.paye)})</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div>
            <h4 className="font-semibold text-sm text-gray-500 mb-2">OTHER DEDUCTIONS</h4>
            <table className="text-sm w-full">
              <tbody>
                {payslip.helb > 0 && (
                  <tr className="border-b">
                    <td className="py-1">HELB</td>
                    <td className="text-right text-red-600">({formatCurrency(payslip.helb)})</td>
                  </tr>
                )}
                {Object.entries(payslip.other_deductions || {}).map(([key, value]) => (
                  <tr key={key} className="border-b">
                    <td className="py-1">{key}</td>
                    <td className="text-right text-red-600">({formatCurrency(value as number)})</td>
                  </tr>
                ))}
                <tr className="font-semibold bg-gray-50">
                  <td className="py-2">Total Deductions</td>
                  <td className="text-right text-red-600">({formatCurrency(payslip.total_deductions)})</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Tax Breakdown */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-semibold text-sm text-gray-500 mb-2">TAX CALCULATION</h4>
          <div className="grid grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-gray-600">Taxable Pay</p>
              <p className="font-semibold">{formatCurrency(payslip.taxable_pay)}</p>
            </div>
            <div>
              <p className="text-gray-600">Income Tax</p>
              <p className="font-semibold">{formatCurrency(payslip.income_tax)}</p>
            </div>
            <div>
              <p className="text-gray-600">Personal Relief</p>
              <p className="font-semibold text-green-600">{formatCurrency(payslip.personal_relief)}</p>
            </div>
            <div>
              <p className="text-gray-600">PAYE Due</p>
              <p className="font-semibold text-red-600">{formatCurrency(payslip.paye)}</p>
            </div>
          </div>
        </div>

        {/* Net Pay */}
        <div className="text-center p-6 bg-green-50 rounded-lg">
          <p className="text-sm text-gray-600 mb-1">NET PAY</p>
          <p className="text-3xl font-bold text-green-700">{formatCurrency(payslip.net_pay)}</p>
        </div>
      </div>
    </div>
  )
}
