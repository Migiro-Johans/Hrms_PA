// Per Diem Management Service

import { createClient } from '@/lib/supabase/server';
import { PerDiemRate, PerDiemRequest } from '@/types';
import { createApprovalRequest } from './workflow';

/**
 * Get per diem rates for a company
 */
export async function getPerDiemRates(companyId: string): Promise<PerDiemRate[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('per_diem_rates')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_active', true);

    if (error) {
        throw new Error(`Failed to fetch per diem rates: ${error.message}`);
    }

    return data as PerDiemRate[];
}

/**
 * Create a new per diem request
 */
export async function createPerDiemRequest(params: {
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
}): Promise<PerDiemRequest> {
    const supabase = await createClient();

    const { data: request, error } = await supabase
        .from('per_diem_requests')
        .insert({
            employee_id: params.employeeId,
            rate_id: params.rateId,
            destination: params.destination,
            purpose: params.purpose,
            start_date: params.startDate,
            end_date: params.endDate,
            days: params.days,
            daily_rate: params.dailyRate,
            accommodation_amount: params.accommodationAmount || 0,
            transport_amount: params.transportAmount || 0,
            total_amount: params.totalAmount,
            status: 'pending',
        })
        .select()
        .single();

    if (error || !request) {
        throw new Error(`Failed to create per diem request: ${error?.message}`);
    }

    // Trigger approval workflow
    try {
        await createApprovalRequest({
            companyId: params.companyId,
            entityType: 'per_diem',
            entityId: request.id,
            requesterId: params.employeeId,
        });
    } catch (error) {
        console.error('Failed to trigger workflow for per diem request:', error);
    }

    return request as PerDiemRequest;
}

/**
 * Get per diem request history
 */
export async function getPerDiemRequests(params: {
    employeeId?: string;
    companyId?: string;
    limit?: number;
}): Promise<PerDiemRequest[]> {
    const supabase = await createClient();

    let query = supabase
        .from('per_diem_requests')
        .select('*, per_diem_rates(*), employees(first_name, last_name)')
        .order('created_at', { ascending: false });

    if (params.employeeId) {
        query = query.eq('employee_id', params.employeeId);
    }

    if (params.limit) {
        query = query.limit(params.limit);
    }

    const { data, error } = await query;

    if (error) {
        throw new Error(`Failed to fetch per diem requests: ${error.message}`);
    }

    return data as PerDiemRequest[];
}
