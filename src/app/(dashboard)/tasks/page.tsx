import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckSquare, Clock, AlertCircle, Plus } from "lucide-react"
import { getTasksAction } from "@/lib/actions/tasks"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { TaskStatusButton } from "@/components/tasks/task-status-button"

export default async function TasksPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect("/login")
    }

    const { data: profile } = await supabase
        .from('users')
        .select('*, employees:employee_id(id, is_line_manager)')
        .eq('id', user.id)
        .single()

    const userRole = profile?.role || "employee"
    const isLineManager = (profile?.employees as any)?.is_line_manager || false
    const canAssignTasks = ["admin", "hr"].includes(userRole) || isLineManager

    const tasks = await getTasksAction({
        employeeId: (profile?.employees as any)?.id || "",
        companyId: profile?.company_id || ""
    })

    return (
        <div className="container mx-auto py-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">My Tasks</h2>
                    <p className="text-muted-foreground">Manage your assigned tasks and action items</p>
                </div>
                {canAssignTasks && (
                    <Link href="/tasks/assign">
                        <Button>
                            <Plus className="h-4 w-4 mr-2" />
                            Assign Task
                        </Button>
                    </Link>
                )}
            </div>

            {tasks.length === 0 ? (
                <Card className="border-dashed flex flex-col items-center justify-center py-12 text-center">
                    <div className="h-12 w-12 rounded-full bg-blue-50 flex items-center justify-center mb-4">
                        <CheckSquare className="h-6 w-6 text-blue-500" />
                    </div>
                    <CardHeader>
                        <CardTitle>No tasks found</CardTitle>
                        <CardDescription>
                            You have no assigned tasks at the moment.
                        </CardDescription>
                    </CardHeader>
                </Card>
            ) : (
                <div className="grid gap-4">
                    {tasks.map((task) => (
                        <Card key={task.id}>
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <CardTitle className="text-lg">{task.title}</CardTitle>
                                        <Badge
                                            variant={
                                                task.priority === 'urgent' ? 'destructive' :
                                                    task.priority === 'high' ? 'warning' : 'outline'
                                            }
                                        >
                                            {task.priority}
                                        </Badge>
                                    </div>
                                    <CardDescription>{task.description}</CardDescription>
                                </div>
                                <Badge
                                    variant={task.status === 'completed' ? 'success' : 'secondary'}
                                >
                                    {task.status.replace('_', ' ')}
                                </Badge>
                            </CardHeader>
                            <CardContent>
                                <div className="flex justify-between items-center text-sm">
                                    <div className="flex items-center gap-4 text-muted-foreground">
                                        {task.due_date && (
                                            <div className="flex items-center gap-1">
                                                <Clock className="h-3 w-3" />
                                                Due {new Date(task.due_date).toLocaleDateString()}
                                            </div>
                                        )}
                                        {task.assigner && (
                                            <div className="flex items-center gap-1">
                                                <AlertCircle className="h-3 w-3" />
                                                From {(task.assigner as any).first_name} {(task.assigner as any).last_name}
                                            </div>
                                        )}
                                    </div>
                                    {task.status !== 'completed' && (
                                        <TaskStatusButton taskId={task.id} />
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    )
}
