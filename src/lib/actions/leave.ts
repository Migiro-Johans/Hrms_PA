"use server"

import * as leaveService from '@/lib/services/leave';
import { revalidatePath } from 'next/cache';

export async function getLeaveTypesAction(companyId: string) {
    try {
        return await leaveService.getLeaveTypes(companyId);
    } catch (error: any) {
        throw new Error(error.message);
    }
}

export async function getLeaveBalancesAction(employeeId: string, year: number) {
    try {
        return await leaveService.getLeaveBalances(employeeId, year);
    } catch (error: any) {
        throw new Error(error.message);
    }
}

export async function createLeaveRequestAction(params: {
    employeeId: string;
    leaveTypeId: string;
    startDate: string;
    endDate: string;
    reason?: string;
    companyId: string;
}) {
    try {
        const result = await leaveService.createLeaveRequest(params);
        revalidatePath('/leave');
        revalidatePath('/dashboard');
        return result;
    } catch (error: any) {
        throw new Error(error.message);
    }
}

export async function getLeaveRequestsAction(params: {
    employeeId?: string;
    companyId?: string;
    limit?: number;
}) {
    try {
        return await leaveService.getLeaveRequests(params);
    } catch (error: any) {
        throw new Error(error.message);
    }
}
