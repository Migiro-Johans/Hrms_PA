"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { ArrowLeft } from "lucide-react"
import { createLeaveRequestAction } from "@/lib/actions/leave"
import type { LeaveType } from "@/types"

interface NewLeaveFormProps {
    employeeId: string
    companyId: string
    leaveTypes: LeaveType[]
}

export function NewLeaveForm({ employeeId, companyId, leaveTypes }: NewLeaveFormProps) {
    const router = useRouter()
    const { toast } = useToast()
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        leaveTypeId: "",
        startDate: "",
        endDate: "",
        reason: "",
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!formData.leaveTypeId || !formData.startDate || !formData.endDate) {
            toast({
                title: "Error",
                description: "Please fill in all required fields.",
                variant: "destructive",
            })
            return
        }

        setLoading(true)

        try {
            await createLeaveRequestAction({
                employeeId,
                companyId,
                ...formData,
            })

            toast({
                title: "Request Submitted",
                description: "Your leave request has been sent for approval.",
            })
            router.push("/leave")
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Failed to submit request",
                variant: "destructive",
            })
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <Button
                variant="ghost"
                onClick={() => router.back()}
                className="flex items-center gap-2"
            >
                <ArrowLeft className="h-4 w-4" /> Back to Leave
            </Button>

            <Card>
                <CardHeader>
                    <CardTitle>Request New Leave</CardTitle>
                    <CardDescription>Fill in the details to submit your leave request</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="leave_type">Leave Type</Label>
                            <Select
                                required
                                onValueChange={(value) => setFormData(prev => ({ ...prev, leaveTypeId: value }))}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent>
                                    {leaveTypes.map((type) => (
                                        <SelectItem key={type.id} value={type.id}>
                                            {type.name} ({type.days_per_year} days)
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="start_date">Start Date</Label>
                                <Input
                                    type="date"
                                    required
                                    id="start_date"
                                    value={formData.startDate}
                                    onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="end_date">End Date</Label>
                                <Input
                                    type="date"
                                    required
                                    id="end_date"
                                    value={formData.endDate}
                                    onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="reason">Reason (Optional)</Label>
                            <Textarea
                                id="reason"
                                placeholder="Provide more details about your leave..."
                                className="min-h-[100px]"
                                value={formData.reason}
                                onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                            />
                        </div>

                        <div className="pt-4 flex justify-end gap-4">
                            <Button variant="outline" type="button" onClick={() => router.back()}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={loading}>
                                {loading ? "Submitting..." : "Submit Request"}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
