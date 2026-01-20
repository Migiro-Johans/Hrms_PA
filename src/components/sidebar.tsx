"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Users,
  DollarSign,
  FileText,
  Settings,
  Building2,
  Calculator,
} from "lucide-react"

interface SidebarProps {
  user: {
    role: string
    companies?: {
      name: string
    }
  } | null
}

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: ["admin", "hr", "accountant", "employee"] },
  { name: "Employees", href: "/employees", icon: Users, roles: ["admin", "hr"] },
  { name: "Payroll", href: "/payroll", icon: DollarSign, roles: ["admin", "accountant"] },
  { name: "My Payslips", href: "/payslips", icon: FileText, roles: ["admin", "hr", "accountant", "employee"] },
  { name: "Reports", href: "/reports", icon: Calculator, roles: ["admin", "hr", "accountant"] },
  { name: "Settings", href: "/settings", icon: Settings, roles: ["admin"] },
]

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname()
  const userRole = user?.role || "employee"

  const filteredNavigation = navigation.filter((item) =>
    item.roles.includes(userRole)
  )

  return (
    <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-64 lg:flex-col">
      <div className="flex grow flex-col gap-y-5 overflow-y-auto border-r border-gray-200 bg-white px-6 pb-4">
        <div className="flex h-16 shrink-0 items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-lg font-bold text-white">KP</span>
            </div>
            <span className="text-lg font-semibold">Payroll</span>
          </div>
        </div>
        {user?.companies?.name && (
          <div className="flex items-center gap-2 px-2 py-2 bg-gray-50 rounded-lg">
            <Building2 className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700 truncate">
              {user.companies.name}
            </span>
          </div>
        )}
        <nav className="flex flex-1 flex-col">
          <ul role="list" className="flex flex-1 flex-col gap-y-7">
            <li>
              <ul role="list" className="-mx-2 space-y-1">
                {filteredNavigation.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
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
