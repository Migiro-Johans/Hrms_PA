"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import {
  ArrowLeft,
  Users,
  Shield,
  Search,
  UserCog,
  Crown,
  Briefcase,
  Calculator,
  TrendingUp,
  User,
  UserPlus,
  Link as LinkIcon,
} from "lucide-react"
import {
  getCompanyUsersAction,
  updateUserRoleAction,
  updateLineManagerStatusAction,
  getRoleStatsAction,
  getLineManagerCountAction,
} from "@/lib/actions/admin"
import type { UserRole } from "@/types"

interface UserWithEmployee {
  id: string
  email: string
  company_id: string
  role: UserRole
  employee_id?: string
  created_at: string
  employee?: {
    id: string
    first_name: string
    last_name: string
    staff_id?: string
    job_title?: string
    is_line_manager: boolean
    department?: {
      id: string
      name: string
    }
  }
}

const ROLE_CONFIG: Record<UserRole, { label: string; icon: any; color: string; description: string }> = {
  admin: {
    label: "Admin",
    icon: Crown,
    color: "bg-red-100 text-red-700 border-red-200",
    description: "Full system access - all features and settings",
  },
  hr: {
    label: "HR",
    icon: Users,
    color: "bg-blue-100 text-blue-700 border-blue-200",
    description: "Employee management, leave approvals, performance reviews",
  },
  finance: {
    label: "Finance",
    icon: Calculator,
    color: "bg-green-100 text-green-700 border-green-200",
    description: "Payroll processing, per diem rates, financial reports",
  },
  management: {
    label: "Management",
    icon: TrendingUp,
    color: "bg-purple-100 text-purple-700 border-purple-200",
    description: "Final approvals, department oversight, promotions",
  },
  employee: {
    label: "Employee",
    icon: User,
    color: "bg-gray-100 text-gray-700 border-gray-200",
    description: "Self-service - tasks, leave requests, payslips",
  },
}

export default function UserManagementPage() {
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<UserWithEmployee[]>([])
  const [filteredUsers, setFilteredUsers] = useState<UserWithEmployee[]>([])
  const [roleStats, setRoleStats] = useState<Record<string, number>>({})
  const [lineManagerCount, setLineManagerCount] = useState(0)
  const [companyId, setCompanyId] = useState("")
  const [currentUserId, setCurrentUserId] = useState("")

  // Filters
  const [searchTerm, setSearchTerm] = useState("")
  const [roleFilter, setRoleFilter] = useState<string>("all")

  // Edit dialog
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserWithEmployee | null>(null)
  const [newRole, setNewRole] = useState<UserRole>("employee")
  const [isLineManager, setIsLineManager] = useState(false)
  const [saving, setSaving] = useState(false)

  // Add user dialog
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [newUserEmail, setNewUserEmail] = useState("")
  const [newUserPassword, setNewUserPassword] = useState("")
  const [newUserRole, setNewUserRole] = useState<UserRole>("employee")
  const [newUserEmployeeId, setNewUserEmployeeId] = useState("")
  const [availableEmployees, setAvailableEmployees] = useState<any[]>([])
  const [loadingEmployees, setLoadingEmployees] = useState(false)
  const [addingUser, setAddingUser] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    filterUsers()
  }, [users, searchTerm, roleFilter])

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      router.push("/login")
      return
    }

    setCurrentUserId(user.id)

    const { data: profile } = await supabase
      .from("users")
      .select("company_id, role")
      .eq("id", user.id)
      .single()

    if (profile?.role !== "admin") {
      router.push("/dashboard")
      return
    }

    setCompanyId(profile.company_id)

    try {
      const [usersData, stats, lmCount] = await Promise.all([
        getCompanyUsersAction(profile.company_id),
        getRoleStatsAction(profile.company_id),
        getLineManagerCountAction(profile.company_id),
      ])

      setUsers(usersData)
      setRoleStats(stats)
      setLineManagerCount(lmCount)
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load users",
      })
    }

    setLoading(false)
  }

  const filterUsers = () => {
    let filtered = [...users]

    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (u) =>
          u.email.toLowerCase().includes(search) ||
          u.employee?.first_name?.toLowerCase().includes(search) ||
          u.employee?.last_name?.toLowerCase().includes(search) ||
          u.employee?.staff_id?.toLowerCase().includes(search)
      )
    }

    if (roleFilter !== "all") {
      if (roleFilter === "line_manager") {
        filtered = filtered.filter((u) => u.employee?.is_line_manager)
      } else {
        filtered = filtered.filter((u) => u.role === roleFilter)
      }
    }

    setFilteredUsers(filtered)
  }

  const openEditDialog = (user: UserWithEmployee) => {
    setSelectedUser(user)
    setNewRole(user.role)
    setIsLineManager(user.employee?.is_line_manager || false)
    setEditDialogOpen(true)
  }

  const openAddDialog = async () => {
    setNewUserEmail("")
    setNewUserPassword("")
    setNewUserRole("employee")
    setNewUserEmployeeId("")
    setAddDialogOpen(true)

    // Fetch employees without user accounts
    setLoadingEmployees(true)
    try {
      const response = await fetch("/api/admin/users")
      const data = await response.json()
      if (data.employees) {
        setAvailableEmployees(data.employees)
      }
    } catch (error) {
      console.error("Failed to fetch employees:", error)
    }
    setLoadingEmployees(false)
  }

  const handleAddUser = async () => {
    if (!newUserEmail || !newUserPassword) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Email and password are required",
      })
      return
    }

    if (newUserPassword.length < 6) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Password must be at least 6 characters",
      })
      return
    }

    setAddingUser(true)

    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: newUserEmail,
          password: newUserPassword,
          role: newUserRole,
          employee_id: newUserEmployeeId || null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        toast({
          variant: "destructive",
          title: "Error",
          description: data.error || "Failed to create user",
        })
        return
      }

      toast({
        title: "Success",
        description: `User ${newUserEmail} created successfully`,
      })

      setAddDialogOpen(false)
      await loadData()
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create user",
      })
    }

    setAddingUser(false)
  }

  const handleSave = async () => {
    if (!selectedUser) return

    setSaving(true)

    let hasError = false

    // Update role if changed
    if (newRole !== selectedUser.role) {
      const result = await updateUserRoleAction(selectedUser.id, newRole, currentUserId)
      if (result.error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: result.error,
        })
        hasError = true
      }
    }

    // Update line manager status if changed and employee exists
    if (
      selectedUser.employee &&
      isLineManager !== selectedUser.employee.is_line_manager
    ) {
      const result = await updateLineManagerStatusAction(
        selectedUser.employee.id,
        isLineManager,
        currentUserId,
        companyId
      )
      if (result.error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: result.error,
        })
        hasError = true
      }
    }

    if (!hasError) {
      toast({
        title: "Success",
        description: "User permissions updated successfully",
      })

      // Refresh data
      await loadData()
    }

    setSaving(false)
    setEditDialogOpen(false)
  }

  const getRoleBadge = (role: UserRole) => {
    const config = ROLE_CONFIG[role]
    return (
      <Badge className={`${config.color} border`}>
        <config.icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    )
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
          <h1 className="text-2xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground">
            Assign roles and permissions to users
          </p>
        </div>
      </div>

      {/* Role Stats */}
      <div className="grid gap-4 md:grid-cols-6">
        {Object.entries(ROLE_CONFIG).map(([role, config]) => (
          <Card key={role}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`h-10 w-10 rounded-lg ${config.color} flex items-center justify-center`}>
                  <config.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{roleStats[role] || 0}</p>
                  <p className="text-xs text-muted-foreground">{config.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-orange-100 text-orange-700 flex items-center justify-center">
                <Briefcase className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{lineManagerCount}</p>
                <p className="text-xs text-muted-foreground">Line Managers</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Role Descriptions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Role Permissions Guide
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {Object.entries(ROLE_CONFIG).map(([role, config]) => (
              <div key={role} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <div className={`h-8 w-8 rounded ${config.color} flex items-center justify-center flex-shrink-0`}>
                  <config.icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-medium text-sm">{config.label}</p>
                  <p className="text-xs text-muted-foreground">{config.description}</p>
                </div>
              </div>
            ))}
            <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg">
              <div className="h-8 w-8 rounded bg-orange-100 text-orange-700 flex items-center justify-center flex-shrink-0">
                <Briefcase className="h-4 w-4" />
              </div>
              <div>
                <p className="font-medium text-sm">Line Manager</p>
                <p className="text-xs text-muted-foreground">
                  Additional permission - approve team leave/per diem, assign tasks
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Users</CardTitle>
              <CardDescription>
                {filteredUsers.length} of {users.length} users
              </CardDescription>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 w-64"
                />
              </div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="hr">HR</SelectItem>
                  <SelectItem value="finance">Finance</SelectItem>
                  <SelectItem value="management">Management</SelectItem>
                  <SelectItem value="employee">Employee</SelectItem>
                  <SelectItem value="line_manager">Line Managers</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={openAddDialog}>
                <UserPlus className="h-4 w-4 mr-2" />
                Add User
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Line Manager</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                        <span className="text-sm font-medium">
                          {user.employee
                            ? `${user.employee.first_name?.[0] || ""}${user.employee.last_name?.[0] || ""}`
                            : user.email[0].toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium">
                          {user.employee
                            ? `${user.employee.first_name} ${user.employee.last_name}`
                            : "No Employee Profile"}
                        </p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {user.employee?.department?.name || "-"}
                  </TableCell>
                  <TableCell>{getRoleBadge(user.role)}</TableCell>
                  <TableCell>
                    {user.employee?.is_line_manager ? (
                      <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                        <Briefcase className="h-3 w-3 mr-1" />
                        Yes
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(user.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(user)}
                      disabled={user.id === currentUserId}
                    >
                      <UserCog className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User Permissions</DialogTitle>
            <DialogDescription>
              {selectedUser?.employee
                ? `${selectedUser.employee.first_name} ${selectedUser.employee.last_name}`
                : selectedUser?.email}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label>System Role</Label>
              <Select value={newRole} onValueChange={(v) => setNewRole(v as UserRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ROLE_CONFIG).map(([role, config]) => (
                    <SelectItem key={role} value={role}>
                      <div className="flex items-center gap-2">
                        <config.icon className="h-4 w-4" />
                        {config.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {ROLE_CONFIG[newRole].description}
              </p>
            </div>

            {selectedUser?.employee && (
              <div className="flex items-center space-x-3 p-4 bg-orange-50 rounded-lg">
                <Checkbox
                  id="lineManager"
                  checked={isLineManager}
                  onCheckedChange={(checked) => setIsLineManager(checked as boolean)}
                />
                <div className="space-y-1">
                  <Label htmlFor="lineManager" className="font-medium cursor-pointer">
                    Line Manager
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Can approve leave/per diem for team members, assign tasks, manage department objectives
                  </p>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add User Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
            <DialogDescription>
              Create a new user account and assign their role
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="newEmail">Email Address *</Label>
              <Input
                id="newEmail"
                type="email"
                placeholder="user@company.com"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword">Password *</Label>
              <Input
                id="newPassword"
                type="password"
                placeholder="Minimum 6 characters"
                value={newUserPassword}
                onChange={(e) => setNewUserPassword(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>System Role *</Label>
              <Select value={newUserRole} onValueChange={(v) => setNewUserRole(v as UserRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ROLE_CONFIG).map(([role, config]) => (
                    <SelectItem key={role} value={role}>
                      <div className="flex items-center gap-2">
                        <config.icon className="h-4 w-4" />
                        {config.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {ROLE_CONFIG[newUserRole].description}
              </p>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <LinkIcon className="h-4 w-4" />
                Link to Employee (Optional)
              </Label>
              <Select value={newUserEmployeeId || "none"} onValueChange={(v) => setNewUserEmployeeId(v === "none" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder={loadingEmployees ? "Loading..." : "Select employee to link"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No employee link</SelectItem>
                  {availableEmployees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.first_name} {emp.last_name} ({emp.staff_id})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Link this user to an existing employee record for payroll and HR features
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddUser} disabled={addingUser}>
              {addingUser ? "Creating..." : "Create User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
