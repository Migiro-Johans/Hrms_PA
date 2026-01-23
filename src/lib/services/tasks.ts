// Task Management Service

import { createClient } from '@/lib/supabase/server';
import { Task } from '@/types';

/**
 * Get tasks assigned to or created by a user
 */
export async function getTasks(params: {
    employeeId: string;
    companyId: string;
    status?: string;
    limit?: number;
}): Promise<Task[]> {
    const supabase = await createClient();

    let query = supabase
        .from('tasks')
        .select('*, assignee:employees!tasks_assigned_to_fkey(first_name, last_name), assigner:employees!tasks_assigned_by_fkey(first_name, last_name)')
        .eq('company_id', params.companyId)
        .or(`assigned_to.eq.${params.employeeId},assigned_by.eq.${params.employeeId}`)
        .order('created_at', { ascending: false });

    if (params.status) {
        query = query.eq('status', params.status);
    }

    if (params.limit) {
        query = query.limit(params.limit);
    }

    const { data, error } = await query;

    if (error) {
        throw new Error(`Failed to fetch tasks: ${error.message}`);
    }

    return data as Task[];
}

/**
 * Update task status
 */
export async function updateTaskStatus(taskId: string, status: string): Promise<void> {
    const supabase = await createClient();

    const { error } = await supabase
        .from('tasks')
        .update({
            status,
            updated_at: new Date().toISOString(),
            completed_at: status === 'completed' ? new Date().toISOString() : null
        })
        .eq('id', taskId);

    if (error) {
        throw new Error(`Failed to update task: ${error.message}`);
    }
}
