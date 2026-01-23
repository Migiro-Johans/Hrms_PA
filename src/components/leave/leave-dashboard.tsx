"use client"

import { useState, useEffect } from "react"
import { Calendar, Plus, Clock, CheckCircle2, XCircle } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import Link from "next/link"

import type { LeaveBalance, LeaveRequest } from "@/types"

interface LeaveDashboardProps {
    initialBalances: LeaveBalance[]
    initialHistory: any[] // Complex join type
}

export function LeaveDashboard({ initialBalances, initialHistory }: LeaveDashboardProps) {

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Leave Management</h2>
                    <p className="text-muted-foreground">Manage your leave requests and balances</p>
                </div>
                <Link href="/leave/new">
                    <Button className="flex items-center gap-2">
                        <Plus className="h-4 w-4" /> Request Leave
                    </Button>
                </Link>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                {initialBalances.map((b) => (
                    <Card key={b.id}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">{b.leave_type?.name}</CardTitle>
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{Number(b.entitled_days) - Number(b.used_days)} Days</div>
                            <p className="text-xs text-muted-foreground">
                                {Number(b.used_days)} used of {Number(b.entitled_days)} total days
                            </p>
                            <div className="mt-4 h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-primary"
                                    style={{ width: `${(Number(b.used_days) / Number(b.entitled_days)) * 100}%` }}
                                />
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Recent History</CardTitle>
                    <CardDescription>Your leave request history and status</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="divide-y">
                        {initialHistory.length === 0 ? (
                            <p className="py-4 text-sm text-center text-muted-foreground">No leave history found.</p>
                        ) : (
                            initialHistory.map((h) => (
                                <div key={h.id} className="flex items-center justify-between py-4">
                                    <div className="flex items-center gap-4">
                                        <div className="p-2 bg-gray-100 rounded-full">
                                            <Calendar className="h-4 w-4 text-gray-600" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium">{h.leave_types?.name} Leave</p>
                                            <p className="text-xs text-muted-foreground">
                                                {new Date(h.start_date).toLocaleDateString()} - {new Date(h.end_date).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className="text-sm font-medium">{h.days_requested} Days</span>
                                        {h.status === "approved" ? (
                                            <Badge variant="success" className="bg-green-100 text-green-800">Approved</Badge>
                                        ) : h.status === "pending" ? (
                                            <Badge variant="warning" className="bg-yellow-100 text-yellow-800">Pending</Badge>
                                        ) : h.status === "hr_pending" || h.status === "mgmt_pending" ? (
                                            <Badge variant="warning" className="bg-yellow-100 text-yellow-800">In Review</Badge>
                                        ) : (
                                            <Badge variant="destructive">Rejected</Badge>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
