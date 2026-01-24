import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp } from "lucide-react"

export default function PerformancePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Performance Management</h1>
        <p className="text-muted-foreground">
          Track and manage employee performance reviews
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Performance Reviews
          </CardTitle>
          <CardDescription>
            View and manage performance review cycles
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Performance management features coming soon.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
