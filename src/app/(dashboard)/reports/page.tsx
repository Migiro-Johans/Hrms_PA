import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart3, FileText, Users, DollarSign, Calendar } from "lucide-react"

const reports = [
  {
    name: "P9 Tax Forms",
    description: "Generate P9 tax deduction cards for employees",
    href: "/reports/p9",
    icon: FileText,
  },
  {
    name: "Payroll Summary",
    description: "Monthly and annual payroll summaries",
    href: "/reports/payroll",
    icon: DollarSign,
  },
  {
    name: "Employee Reports",
    description: "Employee headcount and demographics",
    href: "/reports/employees",
    icon: Users,
  },
  {
    name: "Leave Reports",
    description: "Leave balances, history, and analytics for all employees",
    href: "/reports/leave",
    icon: Calendar,
  },
  {
    name: "Statutory Reports",
    description: "NSSF, SHIF, PAYE, and other statutory reports",
    href: "/reports/statutory",
    icon: BarChart3,
  },
]

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
        <p className="text-muted-foreground">
          Generate and download payroll and HR reports
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {reports.map((report) => (
          <Link key={report.name} href={report.href}>
            <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <report.icon className="h-5 w-5 text-primary" />
                  {report.name}
                </CardTitle>
                <CardDescription>{report.description}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
