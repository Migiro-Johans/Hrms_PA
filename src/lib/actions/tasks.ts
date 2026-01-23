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
