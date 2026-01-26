"use server"

import * as taskService from '@/lib/services/tasks';
import { revalidatePath } from 'next/cache';

export async function getTasksAction(params: {
    employeeId: string;
    companyId: string;
    status?: string;
    limit?: number;
}) {
    try {
        return await taskService.getTasks(params);
    } catch (error: any) {
        throw new Error(error.message);
    }
}

export async function updateTaskStatusAction(taskId: string, status: string) {
    try {
        const result = await taskService.updateTaskStatus(taskId, status);
        revalidatePath('/tasks');
        revalidatePath('/dashboard');
        return result;
    } catch (error: any) {
        throw new Error(error.message);
    }
}

export async function createTaskAction(params: {
    companyId: string;
    assignedTo: string;
    assignedBy: string;
    title: string;
    description?: string;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    dueDate?: string;
    departmentId?: string;
}) {
    try {
        const result = await taskService.createTask(params);
        revalidatePath('/tasks');
        revalidatePath('/tasks/assign');
        revalidatePath('/dashboard');
        return { data: result, error: null };
    } catch (error: any) {
        return { data: null, error: error.message };
    }
}

export async function getAssignableEmployeesAction(params: {
    companyId: string;
    userId: string;
    userRole: string;
    isLineManager: boolean;
    employeeId?: string;
    departmentId?: string;
}) {
    try {
        return await taskService.getAssignableEmployees(params);
    } catch (error: any) {
        throw new Error(error.message);
    }
}
