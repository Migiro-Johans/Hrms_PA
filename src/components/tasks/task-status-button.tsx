"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { updateTaskStatusAction } from "@/lib/actions/tasks"
import { useToast } from "@/components/ui/use-toast"

interface TaskStatusButtonProps {
    taskId: string
}

export function TaskStatusButton({ taskId }: TaskStatusButtonProps) {
    const [loading, setLoading] = useState(false)
    const { toast } = useToast()

    const handleComplete = async () => {
        setLoading(true)
        try {
            await updateTaskStatusAction(taskId, 'completed')
            toast({
                title: "Task Completed",
                description: "The task has been marked as done.",
            })
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Failed to update task",
                variant: "destructive",
            })
        } finally {
            setLoading(false)
        }
    }

    return (
        <Button
            variant="outline"
            size="sm"
            onClick={handleComplete}
            disabled={loading}
        >
            {loading ? "Updating..." : "Mark as Done"}
        </Button>
    )
}
