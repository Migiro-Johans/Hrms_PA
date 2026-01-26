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

/**
 * Create a new task
 */
export async function createTask(params: {
    companyId: string;
    assignedTo: string;
    assignedBy: string;
    title: string;
    description?: string;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    dueDate?: string;
    departmentId?: string;
}): Promise<Task> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('tasks')
        .insert({
            company_id: params.companyId,
            assigned_to: params.assignedTo,
            assigned_by: params.assignedBy,
            title: params.title,
            description: params.description || null,
            priority: params.priority || 'medium',
            due_date: params.dueDate || null,
            department_id: params.departmentId || null,
            status: 'pending',
            created_at: new Date().toISOString()
        })
        .select()
        .single();

    if (error) {
        throw new Error(`Failed to create task: ${error.message}`);
    }

    return data as Task;
}

/**
 * Get employees that a user can assign tasks to
 * - Line managers can assign to their department members
 * - HR and Admin can assign to anyone in the company
 */
export async function getAssignableEmployees(params: {
    companyId: string;
    userId: string;
    userRole: string;
    isLineManager: boolean;
    employeeId?: string;
    departmentId?: string;
}): Promise<{ id: string; first_name: string; last_name: string; department?: { name: string } }[]> {
    const supabase = await createClient();

    let query = supabase
        .from('employees')
        .select('id, first_name, last_name, departments:department_id(name)')
        .eq('company_id', params.companyId)
        .eq('status', 'active');

    // If line manager, get employees in their department
    if (params.isLineManager && !['admin', 'hr'].includes(params.userRole) && params.departmentId) {
        query = query.eq('department_id', params.departmentId);
    }

    const { data, error } = await query.order('first_name');

    if (error) {
        throw new Error(`Failed to fetch employees: ${error.message}`);
    }

    return data as any[];
}
