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
import { ArrowLeft, Plane } from "lucide-react"
import { createPerDiemRequestAction } from "@/lib/actions/per-diem"
import type { PerDiemRate } from "@/types"

interface NewPerDiemFormProps {
    employeeId: string
    companyId: string
    rates: PerDiemRate[]
}

export function NewPerDiemForm({ employeeId, companyId, rates }: NewPerDiemFormProps) {
    const router = useRouter()
    const { toast } = useToast()
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        rateId: "",
        destination: "",
        purpose: "",
        startDate: "",
        endDate: "",
        days: 1,
        accommodationAmount: 0,
        transportAmount: 0,
    })

    const selectedRate = rates.find(r => r.id === formData.rateId)
    const totalAmount = (selectedRate ? Number(selectedRate.daily_rate) * formData.days : 0) +
        Number(formData.accommodationAmount) +
        Number(formData.transportAmount)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!formData.rateId || !formData.destination || !formData.startDate || !formData.endDate) {
            toast({
                title: "Error",
                description: "Please fill in all required fields.",
                variant: "destructive",
            })
            return
        }

        setLoading(true)

        try {
            await createPerDiemRequestAction({
                employeeId,
                companyId,
                ...formData,
                dailyRate: selectedRate ? Number(selectedRate.daily_rate) : 0,
                totalAmount,
            })

            toast({
                title: "Claim Submitted",
                description: "Your per diem claim has been sent for approval.",
            })
            router.push("/per-diem")
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Failed to submit claim",
                variant: "destructive",
            })
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="container mx-auto py-6 space-y-6">
            <Button
                variant="ghost"
                onClick={() => router.back()}
                className="flex items-center gap-2"
            >
                <ArrowLeft className="h-4 w-4" /> Back to Per Diem
            </Button>

            <div className="max-w-2xl mx-auto">
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-orange-100 rounded-lg">
                                <Plane className="h-5 w-5 text-orange-600" />
                            </div>
                            <CardTitle>New Per Diem Claim</CardTitle>
                        </div>
                        <CardDescription>Submit a new travel expense claim for approval</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="destination">Destination</Label>
                                <Input
                                    required
                                    id="destination"
                                    placeholder="e.g., Mombasa Office"
                                    value={formData.destination}
                                    onChange={(e) => setFormData(prev => ({ ...prev, destination: e.target.value }))}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="purpose">Purpose</Label>
                                <Input
                                    required
                                    id="purpose"
                                    placeholder="e.g., Client Audit"
                                    value={formData.purpose}
                                    onChange={(e) => setFormData(prev => ({ ...prev, purpose: e.target.value }))}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="rate">Rate Type</Label>
                                    <Select
                                        required
                                        onValueChange={(value) => setFormData(prev => ({ ...prev, rateId: value }))}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select rate" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {rates.map((rate) => (
                                                <SelectItem key={rate.id} value={rate.id}>
                                                    {rate.name} (KES {Number(rate.daily_rate).toLocaleString()})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="days">Number of Days</Label>
                                    <Input
                                        type="number"
                                        min="1"
                                        required
                                        id="days"
                                        value={formData.days}
                                        onChange={(e) => setFormData(prev => ({ ...prev, days: parseInt(e.target.value) }))}
                                    />
                                </div>
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

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="accommodation">Accommodation (Optional)</Label>
                                    <Input
                                        type="number"
                                        id="accommodation"
                                        value={formData.accommodationAmount}
                                        onChange={(e) => setFormData(prev => ({ ...prev, accommodationAmount: parseFloat(e.target.value) || 0 }))}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="transport">Transport (Optional)</Label>
                                    <Input
                                        type="number"
                                        id="transport"
                                        value={formData.transportAmount}
                                        onChange={(e) => setFormData(prev => ({ ...prev, transportAmount: parseFloat(e.target.value) || 0 }))}
                                    />
                                </div>
                            </div>

                            <div className="p-4 bg-muted rounded-lg flex justify-between items-center">
                                <span className="font-medium">Total Claim Amount:</span>
                                <span className="text-xl font-bold text-primary">
                                    KES {totalAmount.toLocaleString()}
                                </span>
                            </div>

                            <div className="pt-4 flex justify-end gap-4">
                                <Button variant="outline" type="button" onClick={() => router.back()}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={loading} className="bg-orange-600 hover:bg-orange-700">
                                    {loading ? "Submitting..." : "Submit Claim"}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
