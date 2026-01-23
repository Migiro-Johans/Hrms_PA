import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckSquare } from "lucide-react"

export default async function TasksPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect("/login")
    }

    return (
        <div className="container mx-auto py-6 space-y-6">
            <div>
                <h2 className="text-2xl font-bold tracking-tight">My Tasks</h2>
                <p className="text-muted-foreground">Manage your assigned tasks and action items</p>
            </div>

            <Card className="border-dashed flex flex-col items-center justify-center py-12 text-center">
                <div className="h-12 w-12 rounded-full bg-blue-50 flex items-center justify-center mb-4">
                    <CheckSquare className="h-6 w-6 text-blue-500" />
                </div>
                <CardHeader>
                    <CardTitle>Task Center Coming Soon</CardTitle>
                    <CardDescription>
                        We're currently building a centralized task management system for you.
                    </CardDescription>
                </CardHeader>
            </Card>
        </div>
    )
}
