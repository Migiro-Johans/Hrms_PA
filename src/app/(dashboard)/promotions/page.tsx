import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Award } from "lucide-react"

export default function PromotionsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Promotions</h1>
        <p className="text-muted-foreground">
          Manage employee promotions and career progression
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Promotion Requests
          </CardTitle>
          <CardDescription>
            View and process promotion requests
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Promotions management features coming soon.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
