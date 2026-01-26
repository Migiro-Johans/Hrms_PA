"use client"

import { Button } from "@/components/ui/button"
import { FileSpreadsheet } from "lucide-react"
import { getMonthName } from "@/lib/utils"

interface PayslipData {
  id: string
  basic_salary: number
  car_allowance: number
  meal_allowance: number
  telephone_allowance: number
  housing_allowance: number
  gross_pay: number
  nssf_employee: number
  nssf_employer: number
  shif_employee: number
  ahl_employee: number
  ahl_employer: number
  paye: number
  helb: number
  other_deductions: Record<string, number>
  total_deductions: number
  net_pay: number
  nita: number
  cost_to_company: number
  employees: {
    first_name: string
    last_name: string
    staff_id: string
    email?: string
    kra_pin?: string
    nssf_number?: string
    nhif_number?: string
    bank_name?: string
    account_number?: string
    departments?: { name: string }
  }
}

interface PayrollCsvExportProps {
  payslips: PayslipData[]
  month: number
  year: number
  companyName?: string
}

export function PayrollCsvExport({ payslips, month, year, companyName }: PayrollCsvExportProps) {
  const handleExport = () => {
    // Define CSV headers
    const headers = [
      "Staff ID",
      "Employee Name",
      "Department",
      "Email",
      "KRA PIN",
      "NSSF No",
      "NHIF No",
      "Bank Name",
      "Account Number",
      "Basic Salary",
      "Car Allowance",
      "Meal Allowance",
      "Telephone Allowance",
      "Housing Allowance",
      "Gross Pay",
      "NSSF (Employee)",
      "NSSF (Employer)",
      "SHIF (Employee)",
      "AHL (Employee)",
      "AHL (Employer)",
      "PAYE",
      "HELB",
      "Other Deductions",
      "Total Deductions",
      "Net Pay",
      "NITA (Employer)",
      "Cost to Company",
    ]

    // Build CSV rows
    const rows = payslips.map((p) => {
      const otherDeductions = p.other_deductions
        ? Object.values(p.other_deductions).reduce((sum, val) => sum + (val || 0), 0)
        : 0

      return [
        p.employees?.staff_id || "",
        `${p.employees?.first_name || ""} ${p.employees?.last_name || ""}`.trim(),
        p.employees?.departments?.name || "",
        p.employees?.email || "",
        p.employees?.kra_pin || "",
        p.employees?.nssf_number || "",
        p.employees?.nhif_number || "",
        p.employees?.bank_name || "",
        p.employees?.account_number || "",
        p.basic_salary?.toFixed(2) || "0.00",
        p.car_allowance?.toFixed(2) || "0.00",
        p.meal_allowance?.toFixed(2) || "0.00",
        p.telephone_allowance?.toFixed(2) || "0.00",
        p.housing_allowance?.toFixed(2) || "0.00",
        p.gross_pay?.toFixed(2) || "0.00",
        p.nssf_employee?.toFixed(2) || "0.00",
        p.nssf_employer?.toFixed(2) || "0.00",
        p.shif_employee?.toFixed(2) || "0.00",
        p.ahl_employee?.toFixed(2) || "0.00",
        p.ahl_employer?.toFixed(2) || "0.00",
        p.paye?.toFixed(2) || "0.00",
        p.helb?.toFixed(2) || "0.00",
        otherDeductions.toFixed(2),
        p.total_deductions?.toFixed(2) || "0.00",
        p.net_pay?.toFixed(2) || "0.00",
        p.nita?.toFixed(2) || "0.00",
        p.cost_to_company?.toFixed(2) || "0.00",
      ]
    })

    // Calculate totals
    const totals = payslips.reduce(
      (acc, p) => ({
        basic_salary: acc.basic_salary + (p.basic_salary || 0),
        car_allowance: acc.car_allowance + (p.car_allowance || 0),
        meal_allowance: acc.meal_allowance + (p.meal_allowance || 0),
        telephone_allowance: acc.telephone_allowance + (p.telephone_allowance || 0),
        housing_allowance: acc.housing_allowance + (p.housing_allowance || 0),
        gross_pay: acc.gross_pay + (p.gross_pay || 0),
        nssf_employee: acc.nssf_employee + (p.nssf_employee || 0),
        nssf_employer: acc.nssf_employer + (p.nssf_employer || 0),
        shif_employee: acc.shif_employee + (p.shif_employee || 0),
        ahl_employee: acc.ahl_employee + (p.ahl_employee || 0),
        ahl_employer: acc.ahl_employer + (p.ahl_employer || 0),
        paye: acc.paye + (p.paye || 0),
        helb: acc.helb + (p.helb || 0),
        other_deductions: acc.other_deductions + (p.other_deductions ? Object.values(p.other_deductions).reduce((sum, val) => sum + (val || 0), 0) : 0),
        total_deductions: acc.total_deductions + (p.total_deductions || 0),
        net_pay: acc.net_pay + (p.net_pay || 0),
        nita: acc.nita + (p.nita || 0),
        cost_to_company: acc.cost_to_company + (p.cost_to_company || 0),
      }),
      {
        basic_salary: 0,
        car_allowance: 0,
        meal_allowance: 0,
        telephone_allowance: 0,
        housing_allowance: 0,
        gross_pay: 0,
        nssf_employee: 0,
        nssf_employer: 0,
        shif_employee: 0,
        ahl_employee: 0,
        ahl_employer: 0,
        paye: 0,
        helb: 0,
        other_deductions: 0,
        total_deductions: 0,
        net_pay: 0,
        nita: 0,
        cost_to_company: 0,
      }
    )

    // Add totals row
    const totalsRow = [
      "",
      "TOTALS",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      totals.basic_salary.toFixed(2),
      totals.car_allowance.toFixed(2),
      totals.meal_allowance.toFixed(2),
      totals.telephone_allowance.toFixed(2),
      totals.housing_allowance.toFixed(2),
      totals.gross_pay.toFixed(2),
      totals.nssf_employee.toFixed(2),
      totals.nssf_employer.toFixed(2),
      totals.shif_employee.toFixed(2),
      totals.ahl_employee.toFixed(2),
      totals.ahl_employer.toFixed(2),
      totals.paye.toFixed(2),
      totals.helb.toFixed(2),
      totals.other_deductions.toFixed(2),
      totals.total_deductions.toFixed(2),
      totals.net_pay.toFixed(2),
      totals.nita.toFixed(2),
      totals.cost_to_company.toFixed(2),
    ]

    // Convert to CSV string
    const escapeCSV = (value: string) => {
      if (value.includes(",") || value.includes('"') || value.includes("\n")) {
        return `"${value.replace(/"/g, '""')}"`
      }
      return value
    }

    const csvContent = [
      // Title rows
      [`Payroll Report - ${getMonthName(month)} ${year}`],
      [companyName || ""],
      [],
      headers.map(escapeCSV),
      ...rows.map((row) => row.map(escapeCSV)),
      [],
      totalsRow.map(escapeCSV),
    ]
      .map((row) => row.join(","))
      .join("\n")

    // Download the file
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", `payroll_${year}_${month.toString().padStart(2, "0")}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <Button variant="outline" onClick={handleExport}>
      <FileSpreadsheet className="h-4 w-4 mr-2" />
      Export CSV
    </Button>
  )
}
