"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useToast } from "@/components/ui/use-toast"
import {
  ArrowLeft,
  UserPlus,
  Check,
  X,
  Loader2,
  Copy,
  RefreshCw,
} from "lucide-react"

interface TestUser {
  email: string
  role: string
  password?: string
  status?: string
  error?: string
}

export default function TestUsersPage() {
  const router = useRouter()
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [seeding, setSeeding] = useState(false)
  const [existingUsers, setExistingUsers] = useState<TestUser[]>([])
  const [missingUsers, setMissingUsers] = useState<TestUser[]>([])
  const [allTestUsers, setAllTestUsers] = useState<TestUser[]>([])
  const [seedResults, setSeedResults] = useState<TestUser[] | null>(null)

  useEffect(() => {
    checkTestUsers()
  }, [])

  const checkTestUsers = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/admin/seed-test-users")
      const data = await response.json()

      if (response.ok) {
        setExistingUsers(data.existing || [])
        setMissingUsers(data.missing || [])
        setAllTestUsers(data.allTestUsers || [])
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: data.error || "Failed to check test users",
        })
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to check test users",
      })
    }
    setLoading(false)
  }

  const seedTestUsers = async () => {
    setSeeding(true)
    setSeedResults(null)
    try {
      const response = await fetch("/api/admin/seed-test-users", {
        method: "POST",
      })
      const data = await response.json()

      if (response.ok) {
        setSeedResults(data.results)
        toast({
          title: "Success",
          description: "Test users seeding completed",
        })
        // Refresh the list
        await checkTestUsers()
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: data.error || "Failed to seed test users",
        })
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to seed test users",
      })
    }
    setSeeding(false)
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: "Copied",
      description: "Copied to clipboard",
    })
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-red-100 text-red-700 border-red-200"
      case "hr":
        return "bg-blue-100 text-blue-700 border-blue-200"
      case "finance":
        return "bg-green-100 text-green-700 border-green-200"
      case "management":
        return "bg-purple-100 text-purple-700 border-purple-200"
      case "employee":
        return "bg-gray-100 text-gray-700 border-gray-200"
      default:
        return "bg-gray-100 text-gray-700 border-gray-200"
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/settings">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Test Users</h1>
          <p className="text-muted-foreground">
            Create test users for all roles to test the system
          </p>
        </div>
      </div>

      {/* Action Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Seed Test Users
          </CardTitle>
          <CardDescription>
            Create test users for each role: Admin, HR, Finance, Management, and Employee.
            All users will have the password: <code className="bg-gray-100 px-1 rounded">Test123!</code>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Button onClick={seedTestUsers} disabled={seeding || missingUsers.length === 0}>
              {seeding ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Seeding...
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4 mr-2" />
                  {missingUsers.length === 0 ? "All Users Created" : `Create ${missingUsers.length} Missing Users`}
                </>
              )}
            </Button>
            <Button variant="outline" onClick={checkTestUsers}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>

          {/* Status Summary */}
          <div className="flex gap-4 text-sm">
            <span className="text-green-600">
              <Check className="h-4 w-4 inline mr-1" />
              {existingUsers.length} created
            </span>
            <span className="text-orange-600">
              <X className="h-4 w-4 inline mr-1" />
              {missingUsers.length} missing
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Seed Results */}
      {seedResults && (
        <Card>
          <CardHeader>
            <CardTitle>Seeding Results</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Message</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {seedResults.map((result) => (
                  <TableRow key={result.email}>
                    <TableCell>{result.email}</TableCell>
                    <TableCell>
                      <Badge className={getRoleBadgeColor(result.role)}>
                        {result.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {result.status === "created" && (
                        <Badge className="bg-green-100 text-green-700">Created</Badge>
                      )}
                      {result.status === "skipped" && (
                        <Badge className="bg-yellow-100 text-yellow-700">Skipped</Badge>
                      )}
                      {result.status === "failed" && (
                        <Badge className="bg-red-100 text-red-700">Failed</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {result.error || "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Test Users Credentials */}
      <Card>
        <CardHeader>
          <CardTitle>Test User Credentials</CardTitle>
          <CardDescription>
            Use these credentials to login and test different roles
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Role</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Password</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allTestUsers.map((user) => {
                const exists = existingUsers.some((e) => e.email === user.email)
                return (
                  <TableRow key={user.email}>
                    <TableCell>
                      <Badge className={getRoleBadgeColor(user.role)}>
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono">{user.email}</TableCell>
                    <TableCell className="font-mono">{user.password}</TableCell>
                    <TableCell>
                      {exists ? (
                        <Badge className="bg-green-100 text-green-700">
                          <Check className="h-3 w-3 mr-1" />
                          Created
                        </Badge>
                      ) : (
                        <Badge className="bg-orange-100 text-orange-700">
                          <X className="h-3 w-3 mr-1" />
                          Missing
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(`${user.email}\n${user.password}`)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Role Descriptions */}
      <Card>
        <CardHeader>
          <CardTitle>Role Permissions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="p-4 bg-red-50 rounded-lg">
              <Badge className="bg-red-100 text-red-700 mb-2">Admin</Badge>
              <p className="text-sm text-muted-foreground">
                Full system access - all features, settings, and user management
              </p>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg">
              <Badge className="bg-blue-100 text-blue-700 mb-2">HR</Badge>
              <p className="text-sm text-muted-foreground">
                Employee management, leave approvals, performance reviews
              </p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <Badge className="bg-green-100 text-green-700 mb-2">Finance</Badge>
              <p className="text-sm text-muted-foreground">
                Payroll processing, per diem approvals, financial reports
              </p>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg">
              <Badge className="bg-purple-100 text-purple-700 mb-2">Management</Badge>
              <p className="text-sm text-muted-foreground">
                Final approvals, department oversight, promotions
              </p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <Badge className="bg-gray-100 text-gray-700 mb-2">Employee</Badge>
              <p className="text-sm text-muted-foreground">
                Self-service - view tasks, request leave, view payslips
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
