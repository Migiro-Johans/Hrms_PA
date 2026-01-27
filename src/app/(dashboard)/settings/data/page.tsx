"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Database, Construction } from "lucide-react"
import Link from "next/link"

export default function DataSettingsPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/settings">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">Data & Backup</h1>
          <p className="text-muted-foreground">
            Export data and manage backups
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Construction className="h-5 w-5 text-yellow-500" />
            Coming Soon
          </CardTitle>
          <CardDescription>
            Data management features are under development
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Database className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">
              Data export, backup scheduling, and data retention settings
              will be available soon.
            </p>
            <Link href="/settings">
              <Button variant="outline">Return to Settings</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
