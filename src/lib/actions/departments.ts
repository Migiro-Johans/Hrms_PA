"use server"

import * as departmentService from '@/lib/services/departments';
import { revalidatePath } from 'next/cache';

export async function getDepartmentsAction(companyId: string) {
  try {
    return await departmentService.getDepartments(companyId);
  } catch (error: any) {
    throw new Error(error.message);
  }
}

export async function getDepartmentByIdAction(departmentId: string) {
  try {
    return await departmentService.getDepartmentById(departmentId);
  } catch (error: any) {
    throw new Error(error.message);
  }
}

export async function getDepartmentEmployeesAction(departmentId: string) {
  try {
    return await departmentService.getDepartmentEmployees(departmentId);
  } catch (error: any) {
    throw new Error(error.message);
  }
}

export async function updateDepartmentObjectivesAction(
  departmentId: string,
  objectives: departmentService.Department['objectives']
) {
  try {
    await departmentService.updateDepartmentObjectives(departmentId, objectives);
    revalidatePath(`/departments/${departmentId}`);
    revalidatePath(`/departments/${departmentId}/objectives`);
    return { success: true, error: null };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateDepartmentKPIsAction(
  departmentId: string,
  kpis: departmentService.Department['kpis']
) {
  try {
    await departmentService.updateDepartmentKPIs(departmentId, kpis);
    revalidatePath(`/departments/${departmentId}`);
    revalidatePath(`/departments/${departmentId}/objectives`);
    return { success: true, error: null };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getDepartmentDocumentsAction(departmentId: string) {
  try {
    return await departmentService.getDepartmentDocuments(departmentId);
  } catch (error: any) {
    throw new Error(error.message);
  }
}

export async function createDepartmentDocumentAction(params: {
  departmentId: string;
  type: departmentService.DepartmentDocument['type'];
  title: string;
  content?: string;
  fileUrl?: string;
  createdBy: string;
}) {
  try {
    const result = await departmentService.createDepartmentDocument(params);
    revalidatePath(`/departments/${params.departmentId}/documents`);
    return { data: result, error: null };
  } catch (error: any) {
    return { data: null, error: error.message };
  }
}

export async function deleteDepartmentDocumentAction(documentId: string, departmentId: string) {
  try {
    await departmentService.deleteDepartmentDocument(documentId);
    revalidatePath(`/departments/${departmentId}/documents`);
    return { success: true, error: null };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function canManageDepartmentAction(
  userId: string,
  departmentId: string,
  userRole: string,
  employeeId?: string
) {
  try {
    return await departmentService.canManageDepartment(userId, departmentId, userRole, employeeId);
  } catch (error: any) {
    return false;
  }
}
