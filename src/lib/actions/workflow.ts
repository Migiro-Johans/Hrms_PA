"use server"

import { createApprovalRequest as createRequest, processApproval as processAction } from "@/lib/services/workflow"
import { revalidatePath } from "next/cache"

export async function createApprovalRequestAction(params: any) {
    try {
        const result = await createRequest(params)
        revalidatePath("/payroll")
        revalidatePath(`/payroll/${params.entityId}`)
        return { data: result }
    } catch (error: any) {
        return { error: error.message }
    }
}

export async function processApprovalAction(params: any) {
    try {
        const result = await processAction(params)
        revalidatePath("/payroll")
        revalidatePath("/dashboard")
        return { data: result }
    } catch (error: any) {
        return { error: error.message }
    }
}

export async function getApprovalStatusAction(entityType: string, entityId: string) {
    try {
        const { getApprovalStatus } = await import("@/lib/services/workflow")
        const result = await getApprovalStatus(entityType, entityId)
        return { data: result }
    } catch (error: any) {
        return { error: error.message }
    }
}

export async function getPendingApprovalsAction(
    companyId: string,
    userId: string,
    userRole: string,
    employeeId?: string,
    isLineManager?: boolean
) {
    try {
        const { getPendingApprovalsForUser } = await import("@/lib/services/workflow")
        const result = await getPendingApprovalsForUser(
            companyId,
            userId,
            userRole as any,
            employeeId,
            isLineManager
        )
        return { data: result }
    } catch (error: any) {
        return { error: error.message }
    }
}
