import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Award, ClipboardCheck, Plus, TrendingUp } from "lucide-react"

export default function PromotionsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Promotions</h1>
          <p className="text-muted-foreground">
            Manage employee promotions and career progression
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/promotions/approvals">
            <Button variant="outline">
              <ClipboardCheck className="mr-2 h-4 w-4" />
              View Approvals
            </Button>
          </Link>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Promotion
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Link href="/promotions/approvals">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <ClipboardCheck className="h-5 w-5 text-amber-500" />
                Pending Approvals
              </CardTitle>
              <CardDescription>
                Review and approve promotion requests
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                View all promotion requests waiting for your approval as Line Manager, HR, or Management.
              </p>
            </CardContent>
          </Card>
        </Link>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="h-5 w-5 text-green-500" />
              Promotion History
            </CardTitle>
            <CardDescription>
              View past promotions and salary adjustments
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Coming soon - Track promotion history and career progression.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-primary" />
            How Promotions Work
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-medium">1</div>
                <h4 className="font-medium">Line Manager Approval</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                The employee's direct manager reviews and approves the promotion request.
              </p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-sm font-medium">2</div>
                <h4 className="font-medium">HR Review</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                HR reviews the promotion for policy compliance and budget alignment.
              </p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-sm font-medium">3</div>
                <h4 className="font-medium">Management Approval</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                Final approval from management before the promotion takes effect.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
