"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import type { UserRole } from "@/types"
import {
  LayoutDashboard,
  Users,
  DollarSign,
  FileText,
  Settings,
  Building2,
  Calculator,
  Calendar,
  Plane,
  CheckSquare,
  TrendingUp,
  Award,
  Shield,
  BarChart3,
} from "lucide-react"

interface SidebarProps {
  user: {
    role: UserRole
    employee?: {
      is_line_manager: boolean
    }
    companies?: {
      name: string
    }
  } | null
}

// Navigation items with role-based access
// Roles: admin, hr, finance, management, employee
// 'line_manager' is a special pseudo-role for employees who are line managers
const navigation = [
  // Core - Available to all
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    roles: ["admin", "hr", "finance", "management", "employee"],
  },

  // Employee Self-Service
  {
    name: "My Tasks",
    href: "/tasks",
    icon: CheckSquare,
    roles: ["admin", "hr", "finance", "management", "employee"],
  },
  {
    name: "Leave",
    href: "/leave",
    icon: Calendar,
    roles: ["admin", "hr", "finance", "management", "employee"],
  },
  {
    name: "Per Diem",
    href: "/per-diem",
    icon: Plane,
    roles: ["admin", "hr", "finance", "management", "employee"],
  },
  {
    name: "My Payslips",
    href: "/payslips",
    icon: FileText,
    roles: ["admin", "hr", "finance", "management", "employee"],
  },

  // HR Functions
  {
    name: "Employees",
    href: "/employees",
    icon: Users,
    roles: ["admin", "hr"],
  },
  {
    name: "Departments",
    href: "/departments",
    icon: Building2,
    roles: ["admin", "hr", "management", "line_manager"],
  },

  // Finance Functions
  {
    name: "Payroll",
    href: "/payroll",
    icon: DollarSign,
    roles: ["admin", "finance", "hr", "management"],
  },

  // Performance & Promotions
  {
    name: "Performance",
    href: "/performance",
    icon: TrendingUp,
    roles: ["admin", "hr", "management", "line_manager"],
  },
  {
    name: "Promotions",
    href: "/promotions",
    icon: Award,
    roles: ["admin", "hr", "management"],
  },

  // Reports
  {
    name: "Reports",
    href: "/reports",
    icon: BarChart3,
    roles: ["admin", "hr", "finance", "management"],
  },

  // Admin Functions
  {
    name: "Audit Log",
    href: "/audit",
    icon: Shield,
    roles: ["admin", "hr"],
  },
  {
    name: "Settings",
    href: "/settings",
    icon: Settings,
    roles: ["admin"],
  },
]

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname()
  const userRole = user?.role || "employee"
  const isLineManager = user?.employee?.is_line_manager || false

  // Filter navigation based on user role
  const filteredNavigation = navigation.filter((item) => {
    // Admin sees everything
    if (userRole === "admin") return true

    // Check if user's role is in the allowed roles
    if (item.roles.includes(userRole)) return true

    // Line managers get access to line_manager-specific items
    if (isLineManager && item.roles.includes("line_manager")) return true

    return false
  })

  return (
    <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-64 lg:flex-col">
      <div className="flex grow flex-col gap-y-5 overflow-y-auto border-r border-gray-200 bg-white px-6 pb-4">
        <div className="flex h-16 shrink-0 items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-lg font-bold text-white">MK</span>
            </div>
            <span className="text-lg font-semibold text-primary">HR System</span>
          </div>
        </div>

        {/* Company Name */}
        {user?.companies?.name && (
          <div className="flex items-center gap-2 px-2 py-2 bg-gray-50 rounded-lg">
            <Building2 className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700 truncate">
              {user.companies.name}
            </span>
          </div>
        )}

        {/* Line Manager Badge */}
        {isLineManager && (
          <div className="flex items-center gap-2 px-2 py-1.5 bg-blue-50 rounded-lg border border-blue-100">
            <Users className="h-4 w-4 text-blue-600" />
            <span className="text-xs font-medium text-blue-700">
              Line Manager
            </span>
          </div>
        )}

        <nav className="flex flex-1 flex-col">
          <ul role="list" className="flex flex-1 flex-col gap-y-7">
            <li>
              <ul role="list" className="-mx-2 space-y-1">
                {filteredNavigation.map((item) => {
                  const isActive =
                    pathname === item.href ||
                    pathname.startsWith(`${item.href}/`)
                  return (
                    <li key={item.name}>
                      <Link
                        href={item.href}
                        className={cn(
                          isActive
                            ? "bg-gray-100 text-primary"
                            : "text-gray-700 hover:text-primary hover:bg-gray-50",
                          "group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold"
                        )}
                      >
                        <item.icon
                          className={cn(
                            isActive
                              ? "text-primary"
                              : "text-gray-400 group-hover:text-primary",
                            "h-5 w-5 shrink-0"
                          )}
                          aria-hidden="true"
                        />
                        {item.name}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </li>
          </ul>
        </nav>
      </div>
    </div>
  )
}
