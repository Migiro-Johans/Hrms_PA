"use server"

import * as auditService from '@/lib/services/audit';
import type { AuditLogFilters } from '@/lib/services/audit';

export async function getAuditLogsAction(companyId: string, filters: AuditLogFilters = {}) {
  try {
    return await auditService.getAuditLogs(companyId, filters);
  } catch (error: any) {
    throw new Error(error.message);
  }
}

export async function getCriticalAuditLogsAction(companyId: string, limit: number = 20) {
  try {
    return await auditService.getCriticalAuditLogs(companyId, limit);
  } catch (error: any) {
    throw new Error(error.message);
  }
}

export async function exportAuditLogsAction(companyId: string, filters: AuditLogFilters = {}) {
  try {
    const result = await auditService.getAuditLogs(companyId, { ...filters, limit: 1000 });
    return auditService.exportAuditLogsToCSV(result.logs);
  } catch (error: any) {
    throw new Error(error.message);
  }
}
