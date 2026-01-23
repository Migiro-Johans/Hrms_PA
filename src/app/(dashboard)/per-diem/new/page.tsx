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

export default function NewPerDiemPage() {
    const router = useRouter()
    const { toast } = useToast()
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        // Mock submission
        setTimeout(() => {
            toast({
                title: "Claim Submitted",
                description: "Your per diem claim has been sent for approval.",
            })
            router.push("/per-diem")
            setLoading(false)
        }, 1500)
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
                                <Label htmlFor="project">Project / Purpose</Label>
                                <Input required id="project" placeholder="e.g., Client Visit - Mombasa" />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="destination">Destination Type</Label>
                                    <Select required>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="local">Local</SelectItem>
                                            <SelectItem value="regional">Regional</SelectItem>
                                            <SelectItem value="international">International</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="days">Number of Days</Label>
                                    <Input type="number" min="1" required id="days" placeholder="1" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="start_date">Departure Date</Label>
                                    <Input type="date" required id="start_date" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="end_date">Return Date</Label>
                                    <Input type="date" required id="end_date" />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="notes">Additional Notes</Label>
                                <Textarea
                                    id="notes"
                                    placeholder="Any specific details, travel itinerary, etc."
                                    className="min-h-[100px]"
                                />
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
