"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { CheckCircle2, Clock, ArrowRight, FileText, Calendar, Plane, Award } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { getPendingApprovalsAction } from "@/lib/actions/workflow"
import type { ApprovalRequest, UserRole } from "@/types"

interface PendingApprovalsProps {
    user: {
        id: string
        company_id: string
        role: UserRole
        employee_id?: string
        employee?: {
            is_line_manager: boolean
        }
    }
}

export function PendingApprovals({ user }: PendingApprovalsProps) {
    const [approvals, setApprovals] = useState<ApprovalRequest[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function loadApprovals() {
            try {
                const result = await getPendingApprovalsAction(
                    user.company_id,
                    user.id,
                    user.role,
                    user.employee_id,
                    user.employee?.is_line_manager
                )
                if (result.data) {
                    setApprovals(result.data)
                }
            } catch (error) {
                console.error("Failed to load pending approvals:", error)
            } finally {
                setLoading(false)
            }
        }

        loadApprovals()
    }, [user])

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Pending Approvals</CardTitle>
                    <CardDescription>Items requiring your attention</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                </CardContent>
            </Card>
        )
    }

    if (approvals.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Pending Approvals</CardTitle>
                    <CardDescription>You have no pending items to approve</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center py-6 text-center">
                    <div className="h-12 w-12 rounded-full bg-green-50 flex items-center justify-center mb-3">
                        <CheckCircle2 className="h-6 w-6 text-green-500" />
                    </div>
                    <p className="text-sm text-muted-foreground">All caught up!</p>
                </CardContent>
            </Card>
        )
    }

    const getEntityIcon = (type: string) => {
        switch (type) {
            case "payroll": return <FileText className="h-4 w-4" />
            case "leave": return <Calendar className="h-4 w-4" />
            case "per_diem": return <Plane className="h-4 w-4" />
            case "promotion": return <Award className="h-4 w-4" />
            default: return <Clock className="h-4 w-4" />
        }
    }

    const getApproveUrl = (request: ApprovalRequest) => {
        switch (request.entity_type) {
            case "payroll": return `/payroll/${request.entity_id}/approve`
            case "leave": return `/leave/approvals`
            case "per_diem": return `/per-diem/approvals`
            case "promotion": return `/promotions`
            default: return "#"
        }
    }

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                    <CardTitle className="text-lg text-primary">Pending Approvals</CardTitle>
                    <CardDescription>Review and take action</CardDescription>
                </div>
                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                    {approvals.length} Action Needed
                </Badge>
            </CardHeader>
            <CardContent className="px-0">
                <div className="divide-y">
                    {approvals.map((request) => (
                        <div key={request.id} className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors">
                            <div className="flex items-center gap-4">
                                <div className="p-2 bg-gray-100 rounded-full text-gray-600">
                                    {getEntityIcon(request.entity_type)}
                                </div>
                                <div>
                                    <p className="text-sm font-medium capitalize">
                                        {request.entity_type} Approval Request
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        From: {request.requester?.first_name} {request.requester?.last_name}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground mt-0.5">
                                        {new Date(request.created_at).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>
                            <Link href={getApproveUrl(request)}>
                                <Button variant="ghost" size="sm" className="group">
                                    Review
                                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                                </Button>
                            </Link>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}
