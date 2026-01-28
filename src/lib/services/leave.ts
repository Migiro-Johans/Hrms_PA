// Leave Management Service

import { createClient } from '@/lib/supabase/server';
import { LeaveType, LeaveBalance, LeaveRequest } from '@/types';
import { createApprovalRequest } from './workflow';

function isWeekend(date: Date): boolean {
    const day = date.getDay();
    return day === 0 || day === 6;
}

function toISODate(date: Date): string {
    // Convert to YYYY-MM-DD in local time (safe for date-only comparisons)
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

async function getCompanyHolidayDates(params: {
    companyId: string;
    startDate: string;
    endDate: string;
}): Promise<Set<string>> {
    const supabase = await createClient();

    // If holidays table isn't present in the DB yet, fall back to no holidays.
    const { data, error } = await supabase
        .from('holidays')
        .select('date')
        .eq('company_id', params.companyId)
        .gte('date', params.startDate)
        .lte('date', params.endDate);

    if (error) {
        return new Set();
    }

    return new Set((data || []).map((h: any) => String(h.date).slice(0, 10)));
}

async function calculateWorkingDays(params: {
    companyId: string;
    startDate: string;
    endDate: string;
}): Promise<number> {
    const start = new Date(params.startDate);
    const end = new Date(params.endDate);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        throw new Error('Invalid leave dates supplied');
    }

    if (end < start) {
        throw new Error('End date cannot be before start date');
    }

    const holidays = await getCompanyHolidayDates(params);

    // Iterate day-by-day (inclusive) and count weekdays not in holidays.
    let days = 0;
    const cursor = new Date(start);
    // Normalize time
    cursor.setHours(12, 0, 0, 0);
    end.setHours(12, 0, 0, 0);

    while (cursor <= end) {
        const iso = toISODate(cursor);
        if (!isWeekend(cursor) && !holidays.has(iso)) {
            days += 1;
        }
        cursor.setDate(cursor.getDate() + 1);
    }

    return days;
}

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
        .select('*, leave_types:leave_type_id(*)')
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

    // Calculate working days requested (exclude weekends and configured holidays)
    const diffDays = await calculateWorkingDays({
        companyId,
        startDate,
        endDate,
    });

    if (diffDays <= 0) {
        throw new Error('Selected dates include no working days (weekends/holidays are excluded).');
    }

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
        .select('*, leave_types:leave_type_id(*), employees:employee_id(first_name, last_name)')
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
