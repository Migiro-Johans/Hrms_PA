"use client"

import { useState, useEffect } from "react"
import { Calendar, Plus, Clock, CheckCircle2, XCircle } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import Link from "next/link"

export function LeaveDashboard() {
    const [loading, setLoading] = useState(true)
    const [history, setHistory] = useState([])

    useEffect(() => {
        // Mock data for initial UI
        setTimeout(() => {
            setHistory([
                { id: "1", type: "Annual", start_date: "2024-02-01", end_date: "2024-02-05", status: "approved", days: 5 },
                { id: "2", type: "Sick", start_date: "2024-01-15", end_date: "2024-01-16", status: "approved", days: 2 },
                { id: "3", type: "Annual", start_date: "2024-03-10", end_date: "2024-03-15", status: "hr_pending", days: 6 },
            ])
            setLoading(false)
        }, 1000)
    }, [])

    const balances = [
        { type: "Annual", total: 21, used: 7, remaining: 14 },
        { type: "Sick", total: 10, used: 2, remaining: 8 },
        { type: "Personal", total: 5, used: 0, remaining: 5 },
    ]

    if (loading) {
        return <div className="space-y-6"><Skeleton className="h-40 w-full" /><Skeleton className="h-80 w-full" /></div>
    }

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
                {balances.map((b) => (
                    <Card key={b.type}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">{b.type} Leave</CardTitle>
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{b.remaining} Days</div>
                            <p className="text-xs text-muted-foreground">
                                {b.used} used of {b.total} total days
                            </p>
                            <div className="mt-4 h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-primary"
                                    style={{ width: `${(b.used / b.total) * 100}%` }}
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
                        {history.map((h) => (
                            <div key={h.id} className="flex items-center justify-between py-4">
                                <div className="flex items-center gap-4">
                                    <div className="p-2 bg-gray-100 rounded-full">
                                        <Calendar className="h-4 w-4 text-gray-600" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium">{h.type} Leave</p>
                                        <p className="text-xs text-muted-foreground">
                                            {new Date(h.start_date).toLocaleDateString()} - {new Date(h.end_date).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className="text-sm font-medium">{h.days} Days</span>
                                    {h.status === "approved" ? (
                                        <Badge variant="success" className="bg-green-100 text-green-800">Approved</Badge>
                                    ) : h.status === "hr_pending" ? (
                                        <Badge variant="warning" className="bg-yellow-100 text-yellow-800">Pending HR</Badge>
                                    ) : (
                                        <Badge variant="destructive">Rejected</Badge>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
