// Audit Service - Utilities for viewing and managing audit logs

import { createClient } from '@/lib/supabase/server';
import type { AuditLog } from '@/types';

export interface AuditLogFilters {
  table_name?: string;
  user_id?: string;
  action?: string;
  is_critical?: boolean;
  record_id?: string;
  start_date?: string;
  end_date?: string;
  limit?: number;
  offset?: number;
}

export interface AuditLogResult {
  logs: AuditLog[];
  total: number;
  hasMore: boolean;
}

/**
 * Fetch audit logs with filters
 */
export async function getAuditLogs(
  companyId: string,
  filters: AuditLogFilters = {}
): Promise<AuditLogResult> {
  const supabase = await createClient();

  const {
    table_name,
    user_id,
    action,
    is_critical,
    record_id,
    start_date,
    end_date,
    limit = 50,
    offset = 0,
  } = filters;

  // Build query
  let query = supabase
    .from('audit_logs')
    .select('*, users(email)', { count: 'exact' })
    .eq('company_id', companyId)
    .order('created_at', { ascending: false });

  // Apply filters
  if (table_name) {
    query = query.eq('table_name', table_name);
  }
  if (user_id) {
    query = query.eq('user_id', user_id);
  }
  if (action) {
    query = query.eq('action', action);
  }
  if (is_critical !== undefined) {
    query = query.eq('is_critical', is_critical);
  }
  if (record_id) {
    query = query.eq('record_id', record_id);
  }
  if (start_date) {
    query = query.gte('created_at', start_date);
  }
  if (end_date) {
    query = query.lte('created_at', end_date);
  }

  // Apply pagination
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Failed to fetch audit logs: ${error.message}`);
  }

  return {
    logs: (data || []) as AuditLog[],
    total: count || 0,
    hasMore: (count || 0) > offset + limit,
  };
}

/**
 * Get critical audit logs (payroll changes)
 */
export async function getCriticalAuditLogs(
  companyId: string,
  limit: number = 20
): Promise<AuditLog[]> {
  const result = await getAuditLogs(companyId, {
    is_critical: true,
    limit,
  });
  return result.logs;
}

/**
 * Get audit logs for a specific record
 */
export async function getRecordAuditHistory(
  companyId: string,
  tableName: string,
  recordId: string
): Promise<AuditLog[]> {
  const result = await getAuditLogs(companyId, {
    table_name: tableName,
    record_id: recordId,
    limit: 100,
  });
  return result.logs;
}

/**
 * Get recent activity for a user
 */
export async function getUserActivity(
  companyId: string,
  userId: string,
  limit: number = 20
): Promise<AuditLog[]> {
  const result = await getAuditLogs(companyId, {
    user_id: userId,
    limit,
  });
  return result.logs;
}

/**
 * Format audit log for display
 */
export function formatAuditAction(log: AuditLog): string {
  const tableDisplayNames: Record<string, string> = {
    payroll_runs: 'Payroll Run',
    payslips: 'Payslip',
    salary_structures: 'Salary Structure',
    employees: 'Employee',
    leave_requests: 'Leave Request',
    per_diem_requests: 'Per Diem Request',
    promotion_requests: 'Promotion Request',
    tasks: 'Task',
    performance_reviews: 'Performance Review',
  };

  const actionVerbs: Record<string, string> = {
    INSERT: 'created',
    UPDATE: 'updated',
    DELETE: 'deleted',
    APPROVE: 'approved',
    REJECT: 'rejected',
  };

  const tableName = tableDisplayNames[log.table_name] || log.table_name;
  const action = actionVerbs[log.action] || log.action.toLowerCase();

  return `${tableName} ${action}`;
}

/**
 * Get changed fields between old and new values
 */
export function getChangedFields(
  oldValues: Record<string, unknown> | null | undefined,
  newValues: Record<string, unknown> | null | undefined
): { field: string; old: unknown; new: unknown }[] {
  if (!oldValues || !newValues) {
    return [];
  }

  const changes: { field: string; old: unknown; new: unknown }[] = [];

  // Get all keys from both objects
  const allKeys = new Set([
    ...Object.keys(oldValues),
    ...Object.keys(newValues),
  ]);

  // Fields to ignore in comparison
  const ignoredFields = ['updated_at', 'created_at'];

  for (const key of allKeys) {
    if (ignoredFields.includes(key)) continue;

    const oldVal = oldValues[key];
    const newVal = newValues[key];

    // Simple comparison (doesn't handle nested objects well)
    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      changes.push({
        field: key,
        old: oldVal,
        new: newVal,
      });
    }
  }

  return changes;
}

/**
 * Export audit logs to CSV format
 */
export function exportAuditLogsToCSV(logs: AuditLog[]): string {
  const headers = [
    'Date',
    'Time',
    'User',
    'Action',
    'Table',
    'Record ID',
    'Critical',
    'Changes',
  ];

  const rows = logs.map((log) => {
    const date = new Date(log.created_at);
    const changes = getChangedFields(log.old_values, log.new_values);
    const changesStr = changes
      .map((c) => `${c.field}: ${c.old} → ${c.new}`)
      .join('; ');

    return [
      date.toLocaleDateString(),
      date.toLocaleTimeString(),
      (log.user as { email?: string })?.email || 'System',
      log.action,
      log.table_name,
      log.record_id,
      log.is_critical ? 'Yes' : 'No',
      changesStr,
    ];
  });

  const csvContent = [
    headers.join(','),
    ...rows.map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ),
  ].join('\n');

  return csvContent;
}
