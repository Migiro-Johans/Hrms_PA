"use client"

import { Badge } from "@/components/ui/badge"
import { PAYROLL_STATUS_DISPLAY } from "@/lib/constants"
import type { PayrollStatus } from "@/types"

interface PayrollStatusBadgeProps {
  status: PayrollStatus | string
}

export function PayrollStatusBadge({ status }: PayrollStatusBadgeProps) {
  const statusInfo = PAYROLL_STATUS_DISPLAY[status] || {
    label: status,
    color: "gray",
  }

  const variantMap: Record<string, "success" | "warning" | "error" | "info" | "gray"> = {
    gray: "gray",
    blue: "info",
    yellow: "warning",
    red: "error",
    green: "success",
    emerald: "success",
  }

  const variant = variantMap[statusInfo.color] || "gray"

  return <Badge variant={variant}>{statusInfo.label}</Badge>
}
