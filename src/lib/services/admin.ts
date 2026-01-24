// Admin Service - User and Role Management

import { createClient } from '@/lib/supabase/server';
import type { UserRole } from '@/types';

export interface UserWithEmployee {
  id: string;
  email: string;
  company_id: string;
  role: UserRole;
  employee_id?: string;
  created_at: string;
  employee?: {
    id: string;
    first_name: string;
    last_name: string;
    staff_id?: string;
    job_title?: string;
    is_line_manager: boolean;
    department?: {
      id: string;
      name: string;
    };
  };
}

/**
 * Get all users for a company with employee details
 */
export async function getCompanyUsers(companyId: string): Promise<UserWithEmployee[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('users')
    .select(`
      id,
      email,
      company_id,
      role,
      employee_id,
      created_at,
      employees:employee_id(
        id,
        first_name,
        last_name,
        staff_id,
        job_role,
        is_line_manager,
        departments:department_id(id, name)
      )
    `)
    .eq('company_id', companyId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch users: ${error.message}`);
  }

  // Transform the data to match expected structure
  return (data || []).map((user: any) => ({
    ...user,
    employee: user.employees ? {
      ...user.employees,
      department: user.employees.departments,
    } : undefined,
  }));
}

/**
 * Update a user's role
 */
export async function updateUserRole(
  userId: string,
  newRole: UserRole,
  updatedBy: string
): Promise<void> {
  const supabase = await createClient();

  // Get old role for audit
  const { data: oldUser } = await supabase
    .from('users')
    .select('role, company_id')
    .eq('id', userId)
    .single();

  // Update the role
  const { error } = await supabase
    .from('users')
    .update({ role: newRole })
    .eq('id', userId);

  if (error) {
    throw new Error(`Failed to update role: ${error.message}`);
  }

  // Log the change to audit
  if (oldUser) {
    await supabase.from('audit_logs').insert({
      company_id: oldUser.company_id,
      user_id: updatedBy,
      action: 'UPDATE',
      table_name: 'users',
      record_id: userId,
      old_values: { role: oldUser.role },
      new_values: { role: newRole },
      is_critical: true,
    });
  }
}

/**
 * Update an employee's line manager status
 */
export async function updateLineManagerStatus(
  employeeId: string,
  isLineManager: boolean,
  updatedBy: string,
  companyId: string
): Promise<void> {
  const supabase = await createClient();

  // Get old status for audit
  const { data: oldEmployee } = await supabase
    .from('employees')
    .select('is_line_manager')
    .eq('id', employeeId)
    .single();

  // Update the status
  const { error } = await supabase
    .from('employees')
    .update({ is_line_manager: isLineManager })
    .eq('id', employeeId);

  if (error) {
    throw new Error(`Failed to update line manager status: ${error.message}`);
  }

  // Log the change to audit
  await supabase.from('audit_logs').insert({
    company_id: companyId,
    user_id: updatedBy,
    action: 'UPDATE',
    table_name: 'employees',
    record_id: employeeId,
    old_values: { is_line_manager: oldEmployee?.is_line_manager },
    new_values: { is_line_manager: isLineManager },
    is_critical: true,
  });
}

/**
 * Get role statistics for a company
 */
export async function getRoleStats(companyId: string): Promise<Record<string, number>> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('users')
    .select('role')
    .eq('company_id', companyId);

  if (error) {
    throw new Error(`Failed to fetch role stats: ${error.message}`);
  }

  const stats: Record<string, number> = {
    admin: 0,
    hr: 0,
    finance: 0,
    management: 0,
    employee: 0,
  };

  (data || []).forEach((user: { role: string }) => {
    if (stats[user.role] !== undefined) {
      stats[user.role]++;
    }
  });

  return stats;
}

/**
 * Get count of line managers
 */
export async function getLineManagerCount(companyId: string): Promise<number> {
  const supabase = await createClient();

  const { count, error } = await supabase
    .from('employees')
    .select('id', { count: 'exact', head: true })
    .eq('company_id', companyId)
    .eq('is_line_manager', true);

  if (error) {
    throw new Error(`Failed to fetch line manager count: ${error.message}`);
  }

  return count || 0;
}
