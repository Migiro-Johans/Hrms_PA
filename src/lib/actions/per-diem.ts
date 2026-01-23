"use server"

import * as perDiemService from '@/lib/services/per-diem';
import { revalidatePath } from 'next/cache';

export async function getPerDiemRatesAction(companyId: string) {
    try {
        return await perDiemService.getPerDiemRates(companyId);
    } catch (error: any) {
        throw new Error(error.message);
    }
}

export async function createPerDiemRequestAction(params: {
    employeeId: string;
    rateId: string;
    destination: string;
    purpose: string;
    startDate: string;
    endDate: string;
    days: number;
    dailyRate: number;
    accommodationAmount?: number;
    transportAmount?: number;
    totalAmount: number;
    companyId: string;
}) {
    try {
        const result = await perDiemService.createPerDiemRequest(params);
        revalidatePath('/per-diem');
        revalidatePath('/dashboard');
        return result;
    } catch (error: any) {
        throw new Error(error.message);
    }
}

export async function getPerDiemRequestsAction(params: {
    employeeId?: string;
    companyId?: string;
    limit?: number;
}) {
    try {
        return await perDiemService.getPerDiemRequests(params);
    } catch (error: any) {
        throw new Error(error.message);
    }
}
