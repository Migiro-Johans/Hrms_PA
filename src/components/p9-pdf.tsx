import React from "react"
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer"

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 8,
    fontFamily: "Helvetica",
  },
  header: {
    textAlign: "center",
    marginBottom: 15,
  },
  title: {
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 10,
    marginBottom: 2,
  },
  infoSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  infoRow: {
    flexDirection: "row",
    marginBottom: 2,
  },
  infoLabel: {
    width: 120,
    color: "#333",
  },
  infoValue: {
    fontWeight: "bold",
  },
  table: {
    marginTop: 10,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f0f0f0",
    borderBottom: "1px solid #000",
    borderTop: "1px solid #000",
  },
  tableRow: {
    flexDirection: "row",
    borderBottom: "0.5px solid #ccc",
  },
  totalRow: {
    flexDirection: "row",
    borderTop: "1px solid #000",
    borderBottom: "1px solid #000",
    backgroundColor: "#f0f0f0",
    fontWeight: "bold",
  },
  cell: {
    padding: 3,
    textAlign: "right",
    borderRight: "0.5px solid #ccc",
  },
  monthCell: {
    width: 55,
    textAlign: "left",
  },
  numCell: {
    width: 55,
  },
  headerCell: {
    padding: 4,
    textAlign: "center",
    borderRight: "0.5px solid #000",
    fontWeight: "bold",
    fontSize: 6,
  },
  footer: {
    marginTop: 20,
    fontSize: 7,
  },
  footerSection: {
    marginTop: 10,
    padding: 5,
    border: "0.5px solid #ccc",
  },
  footerTitle: {
    fontWeight: "bold",
    marginBottom: 5,
  },
})

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
]

function formatNumber(num: number): string {
  return num.toLocaleString("en-KE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

interface P9Record {
  month: number
  basic_salary: number
  benefits_noncash: number
  value_of_quarters: number
  total_gross_pay: number
  defined_contribution_30_percent: number
  defined_contribution_actual: number
  defined_contribution_fixed: number
  owner_occupied_interest: number
  retirement_contribution_total: number
  chargeable_pay: number
  tax_charged: number
  personal_relief: number
  insurance_relief: number
  paye_tax: number
}

interface P9PDFProps {
  employee: {
    first_name: string
    last_name: string
    middle_name?: string
    kra_pin?: string
  }
  p9Records: P9Record[]
  year: number
  company: {
    name: string
    kra_pin?: string
  }
}

export function P9PDF({ employee, p9Records, year, company }: P9PDFProps) {
  // Create a map for quick lookup
  const recordsByMonth: Record<number, P9Record> = {}
  p9Records.forEach((record) => {
    recordsByMonth[record.month] = record
  })

  // Calculate totals
  const totals = {
    basic_salary: 0,
    benefits_noncash: 0,
    value_of_quarters: 0,
    total_gross_pay: 0,
    defined_contribution_30_percent: 0,
    defined_contribution_actual: 0,
    defined_contribution_fixed: 0,
    owner_occupied_interest: 0,
    retirement_contribution_total: 0,
    chargeable_pay: 0,
    tax_charged: 0,
    personal_relief: 0,
    insurance_relief: 0,
    paye_tax: 0,
  }

  p9Records.forEach((record) => {
    totals.basic_salary += record.basic_salary || 0
    totals.benefits_noncash += record.benefits_noncash || 0
    totals.value_of_quarters += record.value_of_quarters || 0
    totals.total_gross_pay += record.total_gross_pay || 0
    totals.defined_contribution_30_percent += record.defined_contribution_30_percent || 0
    totals.defined_contribution_actual += record.defined_contribution_actual || 0
    totals.defined_contribution_fixed += record.defined_contribution_fixed || 0
    totals.owner_occupied_interest += record.owner_occupied_interest || 0
    totals.retirement_contribution_total += record.retirement_contribution_total || 0
    totals.chargeable_pay += record.chargeable_pay || 0
    totals.tax_charged += record.tax_charged || 0
    totals.personal_relief += record.personal_relief || 0
    totals.insurance_relief += record.insurance_relief || 0
    totals.paye_tax += record.paye_tax || 0
  })

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>KENYA REVENUE AUTHORITY</Text>
          <Text style={styles.subtitle}>DOMESTIC TAXES DEPARTMENT</Text>
          <Text style={styles.subtitle}>TAX DEDUCTION CARD YEAR {year}</Text>
          <Text style={{ fontSize: 8, marginTop: 2 }}>APPROVAL NUMBER</Text>
        </View>

        {/* Employee and Employer Info */}
        <View style={styles.infoSection}>
          <View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Employer's Name:</Text>
              <Text style={styles.infoValue}>{company.name}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Employee's Main Name:</Text>
              <Text style={styles.infoValue}>{employee.first_name} {employee.last_name}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Employee's Other Name:</Text>
              <Text style={styles.infoValue}>{employee.middle_name || ""}</Text>
            </View>
          </View>
          <View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Employer's PIN:</Text>
              <Text style={styles.infoValue}>{company.kra_pin || ""}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Employee's PIN:</Text>
              <Text style={styles.infoValue}>{employee.kra_pin || ""}</Text>
            </View>
          </View>
        </View>

        {/* Main Table */}
        <View style={styles.table}>
          {/* Header Row */}
          <View style={styles.tableHeader}>
            <Text style={[styles.headerCell, styles.monthCell]}>MONTH</Text>
            <Text style={[styles.headerCell, styles.numCell]}>Basic{"\n"}Salary</Text>
            <Text style={[styles.headerCell, styles.numCell]}>Benefits{"\n"}Non-cash</Text>
            <Text style={[styles.headerCell, styles.numCell]}>Value of{"\n"}Quarters</Text>
            <Text style={[styles.headerCell, styles.numCell]}>Total{"\n"}Gross Pay</Text>
            <Text style={[styles.headerCell, styles.numCell]}>30% of{"\n"}Basic</Text>
            <Text style={[styles.headerCell, styles.numCell]}>Actual{"\n"}Contribution</Text>
            <Text style={[styles.headerCell, styles.numCell]}>Fixed{"\n"}Contribution</Text>
            <Text style={[styles.headerCell, styles.numCell]}>Owner Occ.{"\n"}Interest</Text>
            <Text style={[styles.headerCell, styles.numCell]}>Ret. Cont.{"\n"}Total</Text>
            <Text style={[styles.headerCell, styles.numCell]}>Chargeable{"\n"}Pay</Text>
            <Text style={[styles.headerCell, styles.numCell]}>Tax{"\n"}Charged</Text>
            <Text style={[styles.headerCell, styles.numCell]}>Personal{"\n"}Relief</Text>
            <Text style={[styles.headerCell, styles.numCell]}>Insurance{"\n"}Relief</Text>
            <Text style={[styles.headerCell, styles.numCell]}>PAYE{"\n"}Tax</Text>
          </View>

          {/* Data Rows */}
          {MONTHS.map((month, index) => {
            const record = recordsByMonth[index + 1]
            return (
              <View key={month} style={styles.tableRow}>
                <Text style={[styles.cell, styles.monthCell]}>{month}</Text>
                <Text style={[styles.cell, styles.numCell]}>
                  {record ? formatNumber(record.basic_salary || 0) : "0.00"}
                </Text>
                <Text style={[styles.cell, styles.numCell]}>
                  {record ? formatNumber(record.benefits_noncash || 0) : "0.00"}
                </Text>
                <Text style={[styles.cell, styles.numCell]}>
                  {record ? formatNumber(record.value_of_quarters || 0) : "0.00"}
                </Text>
                <Text style={[styles.cell, styles.numCell]}>
                  {record ? formatNumber(record.total_gross_pay || 0) : "0.00"}
                </Text>
                <Text style={[styles.cell, styles.numCell]}>
                  {record ? formatNumber(record.defined_contribution_30_percent || 0) : "0.00"}
                </Text>
                <Text style={[styles.cell, styles.numCell]}>
                  {record ? formatNumber(record.defined_contribution_actual || 0) : "0.00"}
                </Text>
                <Text style={[styles.cell, styles.numCell]}>
                  {record ? formatNumber(record.defined_contribution_fixed || 0) : "0.00"}
                </Text>
                <Text style={[styles.cell, styles.numCell]}>
                  {record ? formatNumber(record.owner_occupied_interest || 0) : "0.00"}
                </Text>
                <Text style={[styles.cell, styles.numCell]}>
                  {record ? formatNumber(record.retirement_contribution_total || 0) : "0.00"}
                </Text>
                <Text style={[styles.cell, styles.numCell]}>
                  {record ? formatNumber(record.chargeable_pay || 0) : "0.00"}
                </Text>
                <Text style={[styles.cell, styles.numCell]}>
                  {record ? formatNumber(record.tax_charged || 0) : "0.00"}
                </Text>
                <Text style={[styles.cell, styles.numCell]}>
                  {record ? formatNumber(record.personal_relief || 0) : "0.00"}
                </Text>
                <Text style={[styles.cell, styles.numCell]}>
                  {record ? formatNumber(record.insurance_relief || 0) : "0.00"}
                </Text>
                <Text style={[styles.cell, styles.numCell]}>
                  {record ? formatNumber(record.paye_tax || 0) : "0.00"}
                </Text>
              </View>
            )
          })}

          {/* Totals Row */}
          <View style={styles.totalRow}>
            <Text style={[styles.cell, styles.monthCell]}>Totals</Text>
            <Text style={[styles.cell, styles.numCell]}>{formatNumber(totals.basic_salary)}</Text>
            <Text style={[styles.cell, styles.numCell]}>{formatNumber(totals.benefits_noncash)}</Text>
            <Text style={[styles.cell, styles.numCell]}>{formatNumber(totals.value_of_quarters)}</Text>
            <Text style={[styles.cell, styles.numCell]}>{formatNumber(totals.total_gross_pay)}</Text>
            <Text style={[styles.cell, styles.numCell]}>{formatNumber(totals.defined_contribution_30_percent)}</Text>
            <Text style={[styles.cell, styles.numCell]}>{formatNumber(totals.defined_contribution_actual)}</Text>
            <Text style={[styles.cell, styles.numCell]}>{formatNumber(totals.defined_contribution_fixed)}</Text>
            <Text style={[styles.cell, styles.numCell]}>{formatNumber(totals.owner_occupied_interest)}</Text>
            <Text style={[styles.cell, styles.numCell]}>{formatNumber(totals.retirement_contribution_total)}</Text>
            <Text style={[styles.cell, styles.numCell]}>{formatNumber(totals.chargeable_pay)}</Text>
            <Text style={[styles.cell, styles.numCell]}>{formatNumber(totals.tax_charged)}</Text>
            <Text style={[styles.cell, styles.numCell]}>{formatNumber(totals.personal_relief)}</Text>
            <Text style={[styles.cell, styles.numCell]}>{formatNumber(totals.insurance_relief)}</Text>
            <Text style={[styles.cell, styles.numCell]}>{formatNumber(totals.paye_tax)}</Text>
          </View>
        </View>
      </Page>
    </Document>
  )
}
