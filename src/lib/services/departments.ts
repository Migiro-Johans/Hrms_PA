// Department Management Service

import { createClient } from '@/lib/supabase/server';

export interface Department {
  id: string;
  company_id: string;
  name: string;
  description?: string;
  line_manager_id?: string;
  objectives?: Array<{
    id: string;
    title: string;
    description?: string;
    target?: string;
    progress?: number;
    status?: 'pending' | 'in_progress' | 'completed';
  }>;
  kpis?: Array<{
    id: string;
    name: string;
    target: number;
    current: number;
    unit?: string;
  }>;
  created_at: string;
  line_manager?: {
    id: string;
    first_name: string;
    last_name: string;
  };
  _count?: {
    employees: number;
  };
}

export interface DepartmentDocument {
  id: string;
  department_id: string;
  type: 'policy' | 'sop' | 'guideline' | 'other';
  title: string;
  content?: string;
  file_url?: string;
  is_active: boolean;
  created_by?: string;
  created_at: string;
  creator?: {
    first_name: string;
    last_name: string;
  };
}

/**
 * Get all departments for a company
 */
export async function getDepartments(companyId: string): Promise<Department[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('departments')
    .select(`
      *,
      line_manager:employees!departments_line_manager_id_fkey(id, first_name, last_name),
      employees!employees_department_id_fkey(id)
    `)
    .eq('company_id', companyId)
    .order('name');

  if (error) {
    throw new Error(`Failed to fetch departments: ${error.message}`);
  }

  // Transform data to include employee count
  return (data || []).map((dept: any) => ({
    ...dept,
    _count: {
      employees: dept.employees?.length || 0,
    },
    employees: undefined, // Remove the raw employees array
  }));
}

/**
 * Get a single department by ID
 */
export async function getDepartmentById(departmentId: string): Promise<Department | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('departments')
    .select(`
      *,
      line_manager:employees!departments_line_manager_id_fkey(id, first_name, last_name)
    `)
    .eq('id', departmentId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found
    }
    throw new Error(`Failed to fetch department: ${error.message}`);
  }

  return data as Department;
}

/**
 * Get employees in a department
 */
export async function getDepartmentEmployees(departmentId: string): Promise<any[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('employees')
    .select('id, first_name, last_name, job_role, email, is_line_manager, status')
    .eq('department_id', departmentId)
    .eq('status', 'active')
    .order('first_name');

  if (error) {
    throw new Error(`Failed to fetch department employees: ${error.message}`);
  }

  return data || [];
}

/**
 * Update department objectives
 */
export async function updateDepartmentObjectives(
  departmentId: string,
  objectives: Department['objectives']
): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('departments')
    .update({ objectives })
    .eq('id', departmentId);

  if (error) {
    throw new Error(`Failed to update objectives: ${error.message}`);
  }
}

/**
 * Update department KPIs
 */
export async function updateDepartmentKPIs(
  departmentId: string,
  kpis: Department['kpis']
): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('departments')
    .update({ kpis })
    .eq('id', departmentId);

  if (error) {
    throw new Error(`Failed to update KPIs: ${error.message}`);
  }
}

/**
 * Get department documents
 */
export async function getDepartmentDocuments(departmentId: string): Promise<DepartmentDocument[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('department_documents')
    .select(`
      *,
      creator:employees!department_documents_created_by_fkey(first_name, last_name)
    `)
    .eq('department_id', departmentId)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch documents: ${error.message}`);
  }

  return (data || []) as DepartmentDocument[];
}

/**
 * Create a department document
 */
export async function createDepartmentDocument(params: {
  departmentId: string;
  type: DepartmentDocument['type'];
  title: string;
  content?: string;
  fileUrl?: string;
  createdBy: string;
}): Promise<DepartmentDocument> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('department_documents')
    .insert({
      department_id: params.departmentId,
      type: params.type,
      title: params.title,
      content: params.content || null,
      file_url: params.fileUrl || null,
      created_by: params.createdBy,
      is_active: true,
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create document: ${error.message}`);
  }

  return data as DepartmentDocument;
}

/**
 * Delete (deactivate) a department document
 */
export async function deleteDepartmentDocument(documentId: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('department_documents')
    .update({ is_active: false })
    .eq('id', documentId);

  if (error) {
    throw new Error(`Failed to delete document: ${error.message}`);
  }
}

/**
 * Check if user can manage a department
 * - Admin and HR can manage all departments
 * - Line managers can manage their own department
 */
export async function canManageDepartment(
  userId: string,
  departmentId: string,
  userRole: string,
  employeeId?: string
): Promise<boolean> {
  if (['admin', 'hr'].includes(userRole)) {
    return true;
  }

  if (!employeeId) {
    return false;
  }

  const supabase = await createClient();

  const { data } = await supabase
    .from('departments')
    .select('line_manager_id')
    .eq('id', departmentId)
    .single();

  return data?.line_manager_id === employeeId;
}
