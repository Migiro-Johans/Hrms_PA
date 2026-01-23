"use server"

import * as adminService from '@/lib/services/admin';
import { revalidatePath } from 'next/cache';
import type { UserRole } from '@/types';

export async function getCompanyUsersAction(companyId: string) {
  try {
    return await adminService.getCompanyUsers(companyId);
  } catch (error: any) {
    throw new Error(error.message);
  }
}

export async function updateUserRoleAction(
  userId: string,
  newRole: UserRole,
  updatedBy: string
) {
  try {
    await adminService.updateUserRole(userId, newRole, updatedBy);
    revalidatePath('/settings/users');
    revalidatePath('/audit');
    return { success: true, error: null };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateLineManagerStatusAction(
  employeeId: string,
  isLineManager: boolean,
  updatedBy: string,
  companyId: string
) {
  try {
    await adminService.updateLineManagerStatus(employeeId, isLineManager, updatedBy, companyId);
    revalidatePath('/settings/users');
    revalidatePath('/departments');
    revalidatePath('/audit');
    return { success: true, error: null };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getRoleStatsAction(companyId: string) {
  try {
    return await adminService.getRoleStats(companyId);
  } catch (error: any) {
    throw new Error(error.message);
  }
}

export async function getLineManagerCountAction(companyId: string) {
  try {
    return await adminService.getLineManagerCount(companyId);
  } catch (error: any) {
    throw new Error(error.message);
  }
}
