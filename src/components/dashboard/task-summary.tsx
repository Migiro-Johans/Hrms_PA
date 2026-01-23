"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { CheckSquare, Clock, ArrowRight } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { getTasksAction } from "@/lib/actions/tasks"
import type { Task } from "@/types"

interface TaskSummaryProps {
    employeeId: string
    companyId: string
}

export function TaskSummary({ employeeId, companyId }: TaskSummaryProps) {
    const [tasks, setTasks] = useState<Task[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function loadTasks() {
            try {
                const result = await getTasksAction({
                    employeeId,
                    companyId,
                    limit: 3,
                    status: 'pending'
                })
                setTasks(result)
            } catch (error) {
                console.error("Failed to load tasks:", error)
            } finally {
                setLoading(false)
            }
        }

        if (employeeId && companyId) {
            loadTasks()
        }
    }, [employeeId, companyId])

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">My Tasks</CardTitle>
                    <CardDescription>Your recent action items</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Skeleton className="h-12 w-full" />
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                    <CardTitle className="text-lg text-primary">My Tasks</CardTitle>
                    <CardDescription>Recent pending items</CardDescription>
                </div>
                <Badge variant="outline" className="text-xs">
                    {tasks.length} Pending
                </Badge>
            </CardHeader>
            <CardContent className="px-0">
                <div className="divide-y">
                    {tasks.length === 0 ? (
                        <div className="p-6 text-center text-sm text-muted-foreground">
                            No pending tasks
                        </div>
                    ) : (
                        tasks.map((task) => (
                            <div key={task.id} className="flex items-center justify-between px-6 py-3 hover:bg-gray-50 transition-colors">
                                <div className="space-y-1">
                                    <p className="text-sm font-medium line-clamp-1">{task.title}</p>
                                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                        <Clock className="h-3 w-3" />
                                        <span>Due: {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No date'}</span>
                                    </div>
                                </div>
                                <Link href="/tasks">
                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                        <ArrowRight className="h-4 w-4" />
                                    </Button>
                                </Link>
                            </div>
                        ))
                    )}
                </div>
                <div className="p-4 border-t bg-gray-50 bg-opacity-50">
                    <Link href="/tasks">
                        <Button variant="outline" size="sm" className="w-full text-xs">
                            View All Tasks
                        </Button>
                    </Link>
                </div>
            </CardContent>
        </Card>
    )
}
