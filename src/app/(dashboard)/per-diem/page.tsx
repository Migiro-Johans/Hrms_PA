import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Plane, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"

export default async function PerDiemPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect("/login")
    }

    return (
        <div className="container mx-auto py-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Per Diem Management</h2>
                    <p className="text-muted-foreground">Submit and track your travel expense claims</p>
                </div>
                <Button className="flex items-center gap-2">
                    <Plus className="h-4 w-4" /> New Claim
                </Button>
            </div>

            <Card className="border-dashed flex flex-col items-center justify-center py-12 text-center">
                <div className="h-12 w-12 rounded-full bg-orange-50 flex items-center justify-center mb-4">
                    <Plane className="h-6 w-6 text-orange-500" />
                </div>
                <CardHeader>
                    <CardTitle>Per Diem Claims Coming Soon</CardTitle>
                    <CardDescription>
                        The per diem module is currently under development.
                    </CardDescription>
                </CardHeader>
            </Card>
        </div>
    )
}
