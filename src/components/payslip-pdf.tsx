import React from "react"
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer"
import { getMonthName } from "@/lib/utils"

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
  },
  header: {
    textAlign: "center",
    marginBottom: 20,
    borderBottom: "1px solid #000",
    paddingBottom: 10,
  },
  companyName: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 4,
  },
  companyDetails: {
    fontSize: 9,
    color: "#666",
  },
  title: {
    fontSize: 14,
    fontWeight: "bold",
    textAlign: "center",
    marginVertical: 15,
  },
  row: {
    flexDirection: "row",
    marginBottom: 15,
  },
  column: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#666",
    marginBottom: 8,
    borderBottom: "1px solid #eee",
    paddingBottom: 4,
  },
  tableRow: {
    flexDirection: "row",
    borderBottom: "1px solid #eee",
    paddingVertical: 4,
  },
  tableLabel: {
    flex: 1,
    color: "#333",
  },
  tableValue: {
    width: 100,
    textAlign: "right",
  },
  totalRow: {
    flexDirection: "row",
    backgroundColor: "#f5f5f5",
    paddingVertical: 6,
    paddingHorizontal: 4,
    marginTop: 4,
  },
  totalLabel: {
    flex: 1,
    fontWeight: "bold",
  },
  totalValue: {
    width: 100,
    textAlign: "right",
    fontWeight: "bold",
  },
  deduction: {
    color: "#c00",
  },
  netPayBox: {
    marginTop: 20,
    padding: 15,
    backgroundColor: "#e8f5e9",
    textAlign: "center",
    borderRadius: 4,
  },
  netPayLabel: {
    fontSize: 10,
    color: "#666",
    marginBottom: 4,
  },
  netPayValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#2e7d32",
  },
  footer: {
    marginTop: 30,
    fontSize: 8,
    color: "#999",
    textAlign: "center",
  },
  bioData: {
    marginBottom: 4,
  },
  bioLabel: {
    color: "#666",
    width: 80,
  },
  bioValue: {
    fontWeight: "bold",
  },
})

function formatCurrency(amount: number): string {
  return `KES ${amount.toLocaleString("en-KE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

interface PayslipPDFProps {
  payslip: {
    basic_salary: number
    car_allowance: number
    meal_allowance: number
    telephone_allowance: number
    housing_allowance: number
    other_earnings: Record<string, number>
    gross_pay: number
    nssf_employee: number
    shif_employee: number
    ahl_employee: number
    taxable_pay: number
    income_tax: number
    personal_relief: number
    insurance_relief: number
    paye: number
    helb: number
    other_deductions: Record<string, number>
    total_deductions: number
    net_pay: number
    employees: {
      first_name: string
      last_name: string
      middle_name?: string
      staff_id: string
      job_role?: string
      bank_name?: string
      account_number?: string
      kra_pin?: string
      nssf_number?: string
      employment_date?: string
    }
    payroll_runs: {
      month: number
      year: number
      companies: {
        name: string
        address?: string
        email?: string
        phone?: string
      }
    }
  }
}

export function PayslipPDF({ payslip }: PayslipPDFProps) {
  const employee = payslip.employees
  const payrollRun = payslip.payroll_runs
  const company = payrollRun.companies

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.companyName}>{company.name}</Text>
          <Text style={styles.companyDetails}>{company.address}</Text>
          <Text style={styles.companyDetails}>
            {company.email} | {company.phone}
          </Text>
        </View>

        <Text style={styles.title}>
          Payslip for {getMonthName(payrollRun.month)} {payrollRun.year}
        </Text>

        {/* Employee Info and Earnings */}
        <View style={styles.row}>
          <View style={styles.column}>
            <Text style={styles.sectionTitle}>EMPLOYEE BIO DATA</Text>
            <View style={[styles.tableRow, styles.bioData]}>
              <Text style={styles.bioLabel}>Name</Text>
              <Text style={styles.bioValue}>
                {employee.first_name} {employee.middle_name} {employee.last_name}
              </Text>
            </View>
            <View style={[styles.tableRow, styles.bioData]}>
              <Text style={styles.bioLabel}>Staff ID</Text>
              <Text style={styles.bioValue}>{employee.staff_id}</Text>
            </View>
            <View style={[styles.tableRow, styles.bioData]}>
              <Text style={styles.bioLabel}>Job Role</Text>
              <Text style={styles.bioValue}>{employee.job_role || "-"}</Text>
            </View>
            <View style={[styles.tableRow, styles.bioData]}>
              <Text style={styles.bioLabel}>KRA PIN</Text>
              <Text style={styles.bioValue}>{employee.kra_pin || "-"}</Text>
            </View>
            <View style={[styles.tableRow, styles.bioData]}>
              <Text style={styles.bioLabel}>Bank</Text>
              <Text style={styles.bioValue}>{employee.bank_name || "-"}</Text>
            </View>
            <View style={[styles.tableRow, styles.bioData]}>
              <Text style={styles.bioLabel}>Account</Text>
              <Text style={styles.bioValue}>{employee.account_number || "-"}</Text>
            </View>
          </View>

          <View style={[styles.column, { marginLeft: 20 }]}>
            <Text style={styles.sectionTitle}>EARNINGS</Text>
            <View style={styles.tableRow}>
              <Text style={styles.tableLabel}>Basic Salary</Text>
              <Text style={styles.tableValue}>{formatCurrency(payslip.basic_salary)}</Text>
            </View>
            {payslip.car_allowance > 0 && (
              <View style={styles.tableRow}>
                <Text style={styles.tableLabel}>Car Allowance</Text>
                <Text style={styles.tableValue}>{formatCurrency(payslip.car_allowance)}</Text>
              </View>
            )}
            {payslip.meal_allowance > 0 && (
              <View style={styles.tableRow}>
                <Text style={styles.tableLabel}>Meal Allowance</Text>
                <Text style={styles.tableValue}>{formatCurrency(payslip.meal_allowance)}</Text>
              </View>
            )}
            {payslip.telephone_allowance > 0 && (
              <View style={styles.tableRow}>
                <Text style={styles.tableLabel}>Telephone</Text>
                <Text style={styles.tableValue}>{formatCurrency(payslip.telephone_allowance)}</Text>
              </View>
            )}
            {payslip.housing_allowance > 0 && (
              <View style={styles.tableRow}>
                <Text style={styles.tableLabel}>Housing</Text>
                <Text style={styles.tableValue}>{formatCurrency(payslip.housing_allowance)}</Text>
              </View>
            )}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Gross Pay</Text>
              <Text style={styles.totalValue}>{formatCurrency(payslip.gross_pay)}</Text>
            </View>
          </View>
        </View>

        {/* Deductions */}
        <View style={styles.row}>
          <View style={styles.column}>
            <Text style={styles.sectionTitle}>STATUTORY DEDUCTIONS</Text>
            <View style={styles.tableRow}>
              <Text style={styles.tableLabel}>NSSF</Text>
              <Text style={[styles.tableValue, styles.deduction]}>
                ({formatCurrency(payslip.nssf_employee)})
              </Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={styles.tableLabel}>SHIF (SHA)</Text>
              <Text style={[styles.tableValue, styles.deduction]}>
                ({formatCurrency(payslip.shif_employee)})
              </Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={styles.tableLabel}>Affordable Housing Levy</Text>
              <Text style={[styles.tableValue, styles.deduction]}>
                ({formatCurrency(payslip.ahl_employee)})
              </Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={styles.tableLabel}>PAYE</Text>
              <Text style={[styles.tableValue, styles.deduction]}>
                ({formatCurrency(payslip.paye)})
              </Text>
            </View>
          </View>

          <View style={[styles.column, { marginLeft: 20 }]}>
            <Text style={styles.sectionTitle}>OTHER DEDUCTIONS</Text>
            {payslip.helb > 0 && (
              <View style={styles.tableRow}>
                <Text style={styles.tableLabel}>HELB</Text>
                <Text style={[styles.tableValue, styles.deduction]}>
                  ({formatCurrency(payslip.helb)})
                </Text>
              </View>
            )}
            {Object.entries(payslip.other_deductions || {}).map(([key, value]) => (
              <View key={key} style={styles.tableRow}>
                <Text style={styles.tableLabel}>{key}</Text>
                <Text style={[styles.tableValue, styles.deduction]}>
                  ({formatCurrency(value as number)})
                </Text>
              </View>
            ))}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total Deductions</Text>
              <Text style={[styles.totalValue, styles.deduction]}>
                ({formatCurrency(payslip.total_deductions)})
              </Text>
            </View>
          </View>
        </View>

        {/* Net Pay */}
        <View style={styles.netPayBox}>
          <Text style={styles.netPayLabel}>NET PAY</Text>
          <Text style={styles.netPayValue}>{formatCurrency(payslip.net_pay)}</Text>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          This is a computer-generated payslip and does not require a signature.
        </Text>
      </Page>
    </Document>
  )
}
