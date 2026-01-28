"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/components/ui/use-toast"
import { ArrowLeft, Plus, Trash2 } from "lucide-react"

type Holiday = {
  id: string
  company_id: string
  date: string
  name: string | null
  created_at: string
}

export default function HolidaysSettingsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const supabase = useMemo(() => createClient(), [])

  const [loading, setLoading] = useState(true)
  const [holidays, setHolidays] = useState<Holiday[]>([])
  const [companyId, setCompanyId] = useState<string | null>(null)

  const [createOpen, setCreateOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    date: "",
    name: "",
  })

  async function requireAdminAndLoad() {
    setLoading(true)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      router.push("/login")
      return
    }

    const { data: profile, error } = await supabase
      .from("users")
      .select("role, company_id")
      .eq("id", user.id)
      .single()

    if (error || !profile) {
      router.push("/dashboard")
      return
    }

    if (profile.role !== "admin" && profile.role !== "hr") {
      router.push("/dashboard")
      return
    }

    setCompanyId(profile.company_id)

    const { data, error: holidaysError } = await supabase
      .from("holidays")
      .select("id, company_id, date, name, created_at")
      .eq("company_id", profile.company_id)
      .order("date", { ascending: true })

    if (holidaysError) {
      toast({
        variant: "destructive",
        title: "Error",
        description: holidaysError.message,
      })
      setHolidays([])
    } else {
      setHolidays((data || []) as Holiday[])
    }

    setLoading(false)
  }

  useEffect(() => {
    requireAdminAndLoad()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleCreate() {
    if (!companyId) return

    if (!form.date) {
      toast({
        variant: "destructive",
        title: "Missing date",
        description: "Please choose a holiday date.",
      })
      return
    }

    setSubmitting(true)

    const { error } = await supabase.from("holidays").insert({
      company_id: companyId,
      date: form.date,
      name: form.name.trim() ? form.name.trim() : null,
    })

    if (error) {
      toast({
        variant: "destructive",
        title: "Failed to add holiday",
        description: error.message,
      })
      setSubmitting(false)
      return
    }

    toast({ title: "Saved", description: "Holiday added." })
    setCreateOpen(false)
    setForm({ date: "", name: "" })
    await requireAdminAndLoad()
    setSubmitting(false)
  }

  async function handleDelete(holidayId: string) {
    setSubmitting(true)
    const { error } = await supabase.from("holidays").delete().eq("id", holidayId)

    if (error) {
      toast({
        variant: "destructive",
        title: "Failed to delete",
        description: error.message,
      })
    } else {
      toast({ title: "Deleted", description: "Holiday removed." })
      await requireAdminAndLoad()
    }
    setSubmitting(false)
  }

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center min-h-[300px]">
          <p className="text-muted-foreground">Loading…</p>
        </div>
      </div>
    )
  }

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
          <h1 className="text-2xl font-bold tracking-tight">Holiday Calendar</h1>
          <p className="text-muted-foreground">
            HR/Admin-maintained holidays used to exclude days from leave calculations.
          </p>
        </div>

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" /> Add Holiday
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add holiday</DialogTitle>
              <DialogDescription>
                This will be excluded from leave day counts.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="date">Date *</Label>
                <Input
                  id="date"
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  placeholder="e.g. Madaraka Day"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={submitting}>
                {submitting ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Holidays</CardTitle>
          <CardDescription>
            {holidays.length} date{holidays.length === 1 ? "" : "s"} configured
          </CardDescription>
        </CardHeader>
        <CardContent>
          {holidays.length === 0 ? (
            <p className="text-sm text-muted-foreground">No holidays added yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {holidays.map((h) => (
                  <TableRow key={h.id}>
                    <TableCell>{new Date(h.date).toLocaleDateString()}</TableCell>
                    <TableCell>{h.name || "-"}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={submitting}
                        onClick={() => handleDelete(h.id)}
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
