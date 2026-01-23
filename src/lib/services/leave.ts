// Leave Management Service

import { createClient } from '@/lib/supabase/server';
import { LeaveType, LeaveBalance, LeaveRequest } from '@/types';
import { createApprovalRequest } from './workflow';

/**
 * Get available leave types for a company
 */
export async function getLeaveTypes(companyId: string): Promise<LeaveType[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('leave_types')
        .select('*')
        .eq('company_id', companyId);

    if (error) {
        throw new Error(`Failed to fetch leave types: ${error.message}`);
    }

    return data as LeaveType[];
}

/**
 * Get leave balances for an employee
 */
export async function getLeaveBalances(employeeId: string, year: number): Promise<LeaveBalance[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('leave_balances')
        .select('*, leave_types(*)')
        .eq('employee_id', employeeId)
        .eq('year', year);

    if (error) {
        throw new Error(`Failed to fetch leave balances: ${error.message}`);
    }

    return data as LeaveBalance[];
}

/**
 * Create a new leave request
 */
export async function createLeaveRequest(params: {
    employeeId: string;
    leaveTypeId: string;
    startDate: string;
    endDate: string;
    reason?: string;
    companyId: string;
}): Promise<LeaveRequest> {
    const supabase = await createClient();

    const { employeeId, leaveTypeId, startDate, endDate, reason, companyId } = params;

    // Calculate days (simple difference for now, in a real app we'd exclude weekends/holidays)
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    // 1. Create the leave request record
    const { data: request, error: requestError } = await supabase
        .from('leave_requests')
        .insert({
            employee_id: employeeId,
            leave_type_id: leaveTypeId,
            start_date: startDate,
            end_date: endDate,
            days_requested: diffDays,
            reason,
            status: 'pending',
        })
        .select()
        .single();

    if (requestError || !request) {
        throw new Error(`Failed to create leave request: ${requestError?.message}`);
    }

    // 2. Trigger the approval workflow
    try {
        await createApprovalRequest({
            companyId,
            entityType: 'leave',
            entityId: request.id,
            requesterId: employeeId,
        });
    } catch (error) {
        // If workflow creation fails, we might want to roll back or flag the request
        console.error('Failed to trigger workflow for leave request:', error);
    }

    return request as LeaveRequest;
}

/**
 * Get leave request history
 */
export async function getLeaveRequests(params: {
    employeeId?: string;
    companyId?: string;
    limit?: number;
}): Promise<LeaveRequest[]> {
    const supabase = await createClient();

    let query = supabase
        .from('leave_requests')
        .select('*, leave_types(*), employees(first_name, last_name)')
        .order('created_at', { ascending: false });

    if (params.employeeId) {
        query = query.eq('employee_id', params.employeeId);
    }

    if (params.limit) {
        query = query.limit(params.limit);
    }

    const { data, error } = await query;

    if (error) {
        throw new Error(`Failed to fetch leave requests: ${error.message}`);
    }

    return data as LeaveRequest[];
}
