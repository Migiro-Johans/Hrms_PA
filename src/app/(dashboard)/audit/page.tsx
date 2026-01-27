"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
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
import { Shield, Download, Filter, AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react"
import { getAuditLogsAction, exportAuditLogsAction } from "@/lib/actions/audit"
import type { AuditLog, UserRole } from "@/types"

const TABLE_OPTIONS = [
  { value: "all", label: "All Tables" },
  { value: "payroll_runs", label: "Payroll Runs" },
  { value: "payslips", label: "Payslips" },
  { value: "salary_structures", label: "Salary Structures" },
  { value: "employees", label: "Employees" },
  { value: "leave_requests", label: "Leave Requests" },
  { value: "per_diem_requests", label: "Per Diem Requests" },
  { value: "tasks", label: "Tasks" },
  { value: "departments", label: "Departments" },
]

const ACTION_OPTIONS = [
  { value: "all", label: "All Actions" },
  { value: "INSERT", label: "Created" },
  { value: "UPDATE", label: "Updated" },
  { value: "DELETE", label: "Deleted" },
  { value: "APPROVE", label: "Approved" },
  { value: "REJECT", label: "Rejected" },
]

const TIMEZONE = "Africa/Nairobi"

export default function AuditLogPage() {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [total, setTotal] = useState(0)
  const [companyId, setCompanyId] = useState<string>("")

  // ✅ Filters (IMPORTANT: no empty-string values for SelectItem)
  const [tableName, setTableName] = useState("all")
  const [action, setAction] = useState("all")
  const [criticalOnly, setCriticalOnly] = useState(false)
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")

  // Pagination
  const [page, setPage] = useState(1)
  const pageSize = 25

  // ✅ Convert "all" -> undefined so backend doesn't try to match "all" as a real value
  const tableFilter = tableName === "all" ? undefined : tableName
  const actionFilter = action === "all" ? undefined : action

  const loadLogs = useCallback(async () => {
    if (!companyId) return

    setLoading(true)

    try {
      const result = await getAuditLogsAction(companyId, {
        table_name: tableFilter,
        action: actionFilter,
        is_critical: criticalOnly ? true : undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        limit: pageSize,
        offset: (page - 1) * pageSize,
      })

      setLogs(result.logs)
      setTotal(result.total)
    } catch (error) {
      console.error("Failed to load audit logs:", error)
      setLogs([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [
    companyId,
    tableFilter,
    actionFilter,
    criticalOnly,
    startDate,
    endDate,
    page,
  ])

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push("/login")
        return
      }

      const { data: profile, error } = await supabase
        .from("users")
        .select("company_id, role")
        .eq("id", user.id)
        .single()

      if (error) {
        console.error("Failed to load user profile:", error)
        router.push("/dashboard")
        return
      }

      const userRole = (profile?.role || "employee") as UserRole

      // Only admin and hr can access audit logs
      if (!["admin", "hr"].includes(userRole)) {
        router.push("/dashboard")
        return
      }

      setCompanyId(profile?.company_id || "")
    }

    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (companyId) loadLogs()
  }, [companyId, loadLogs])

  const handleExport = async () => {
    if (!companyId) return
    setExporting(true)

    try {
      const csv = await exportAuditLogsAction(companyId, {
        table_name: tableFilter,
        action: actionFilter,
        is_critical: criticalOnly ? true : undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
      })

      // Download CSV
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `audit-logs-${new Date().toISOString().split("T")[0]}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error("Failed to export:", error)
    } finally {
      setExporting(false)
    }
  }

  const resetFilters = () => {
    setTableName("all")
    setAction("all")
    setCriticalOnly(false)
    setStartDate("")
    setEndDate("")
    setPage(1)
  }

  const totalPages = Math.ceil(total / pageSize)

  const getActionBadge = (action: string, isCritical: boolean) => {
    if (isCritical) return <Badge variant="destructive">{action}</Badge>

    const variants: Record<string, "default" | "secondary" | "success" | "warning" | "destructive"> = {
      INSERT: "success",
      UPDATE: "default",
      DELETE: "destructive",
      APPROVE: "success",
      REJECT: "warning",
    }

    return <Badge variant={variants[action] || "secondary"}>{action}</Badge>
  }

  const formatTableName = (table: string) => {
    const names: Record<string, string> = {
      payroll_runs: "Payroll",
      payslips: "Payslip",
      salary_structures: "Salary",
      employees: "Employee",
      leave_requests: "Leave",
      per_diem_requests: "Per Diem",
      tasks: "Task",
      departments: "Department",
    }
    return names[table] || table
  }

  const safeRecordId = (rid: unknown) => {
    const s = (rid ?? "").toString()
    if (!s) return "-"
    return s.length <= 8 ? s : `${s.slice(0, 8)}...`
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Audit Log</h1>
          <p className="text-muted-foreground">Track all system activities and changes</p>
        </div>
        <Button onClick={handleExport} disabled={exporting || logs.length === 0}>
          <Download className="h-4 w-4 mr-2" />
          {exporting ? "Exporting..." : "Export CSV"}
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            <CardTitle className="text-base">Filters</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label>Table</Label>
              <Select value={tableName} onValueChange={(v) => { setTableName(v); setPage(1) }}>
                <SelectTrigger>
                  <SelectValue placeholder="All Tables" />
                </SelectTrigger>
                <SelectContent>
                  {TABLE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Action</Label>
              <Select value={action} onValueChange={(v) => { setAction(v); setPage(1) }}>
                <SelectTrigger>
                  <SelectValue placeholder="All Actions" />
                </SelectTrigger>
                <SelectContent>
                  {ACTION_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>From Date</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => { setStartDate(e.target.value); setPage(1) }}
              />
            </div>

            <div className="space-y-2">
              <Label>To Date</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => { setEndDate(e.target.value); setPage(1) }}
              />
            </div>

            <div className="space-y-2">
              <Label>&nbsp;</Label>
              <div className="flex gap-2">
                <Button
                  variant={criticalOnly ? "default" : "outline"}
                  className="flex-1"
                  onClick={() => { setCriticalOnly(!criticalOnly); setPage(1) }}
                >
                  <AlertTriangle className="h-4 w-4 mr-1" />
                  Critical
                </Button>
                <Button variant="outline" onClick={resetFilters}>
                  Reset
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <CardHeader>
          <CardTitle>Activity Log</CardTitle>
          <CardDescription>
            {total} record{total !== 1 ? "s" : ""} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="h-12 w-12 rounded-full bg-gray-50 flex items-center justify-center mb-4">
                <Shield className="h-6 w-6 text-gray-400" />
              </div>
              <p className="text-muted-foreground">No audit logs found</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp (EAT)</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Table</TableHead>
                    <TableHead>Record ID</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => {
                    const dt = new Date(log.created_at)
                    return (
                      <TableRow key={log.id} className={log.is_critical ? "bg-red-50" : ""}>
                        <TableCell className="text-sm">
                          <div>
                            {dt.toLocaleDateString(undefined, { timeZone: TIMEZONE })}
                          </div>
                          <div className="text-muted-foreground text-xs">
                            {dt.toLocaleTimeString(undefined, { timeZone: TIMEZONE })}
                          </div>
                        </TableCell>
                        <TableCell>
                          {(log.user as any)?.email || "System"}
                        </TableCell>
                        <TableCell>
                          {getActionBadge(log.action, log.is_critical)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{formatTableName(log.table_name)}</Badge>
                        </TableCell>
                        <TableCell className="text-xs font-mono text-muted-foreground">
                          {safeRecordId(log.record_id)}
                        </TableCell>
                        <TableCell className="max-w-[200px]">
                          {log.new_values ? (
                            <span className="text-xs text-muted-foreground truncate block">
                              {Object.keys(log.new_values).slice(0, 3).join(", ")}
                              {Object.keys(log.new_values).length > 3 ? "..." : ""}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    Page {page} of {totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page - 1)}
                      disabled={page === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page + 1)}
                      disabled={page === totalPages}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
