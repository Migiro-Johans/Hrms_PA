// Notification Service - Email notification queue management

import { createClient } from '@/lib/supabase/server';
import type { NotificationType, NotificationQueueItem } from '@/types';

export interface QueueNotificationParams {
  companyId: string;
  type: NotificationType;
  recipientEmail: string;
  recipientId?: string;
  subject: string;
  body: string;
  metadata?: Record<string, unknown>;
}

/**
 * Queue a notification for sending
 */
export async function queueNotification(
  params: QueueNotificationParams
): Promise<NotificationQueueItem> {
  const supabase = await createClient();

  const {
    companyId,
    type,
    recipientEmail,
    recipientId,
    subject,
    body,
    metadata = {},
  } = params;

  const { data, error } = await supabase
    .from('notification_queue')
    .insert({
      company_id: companyId,
      type,
      recipient_email: recipientEmail,
      recipient_id: recipientId,
      subject,
      body,
      metadata,
      status: 'pending',
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to queue notification: ${error.message}`);
  }

  return data as NotificationQueueItem;
}

/**
 * Queue payslip ready notifications for all employees in a payroll run
 */
export async function queuePayslipNotifications(
  payrollRunId: string
): Promise<number> {
  const supabase = await createClient();

  // Get all payslips with employee details
  const { data: payslips, error: payslipsError } = await supabase
    .from('payslips')
    .select(
      '*, employees(id, email, first_name, last_name), payroll_runs(company_id, month, year)'
    )
    .eq('payroll_run_id', payrollRunId);

  if (payslipsError || !payslips) {
    throw new Error('Failed to fetch payslips');
  }

  let queuedCount = 0;

  for (const payslip of payslips) {
    const employee = payslip.employees as {
      id: string;
      email: string;
      first_name: string;
      last_name: string;
    };
    const payrollRun = payslip.payroll_runs as {
      company_id: string;
      month: number;
      year: number;
    };

    if (!employee?.email) continue;

    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];
    const monthName = monthNames[payrollRun.month - 1];

    try {
      await queueNotification({
        companyId: payrollRun.company_id,
        type: 'payslip_ready',
        recipientEmail: employee.email,
        recipientId: employee.id,
        subject: `Your payslip for ${monthName} ${payrollRun.year} is ready`,
        body: `
Dear ${employee.first_name},

Your payslip for ${monthName} ${payrollRun.year} is now available.

You can view and download your payslip by logging into the HR portal.

Net Pay: KES ${payslip.net_pay.toLocaleString()}

Best regards,
HR Team
        `.trim(),
        metadata: {
          payslip_id: payslip.id,
          payroll_run_id: payrollRunId,
          net_pay: payslip.net_pay,
        },
      });
      queuedCount++;
    } catch (err) {
      console.error(`Failed to queue notification for ${employee.email}:`, err);
    }
  }

  return queuedCount;
}

/**
 * Queue leave request status notification
 */
export async function queueLeaveStatusNotification(
  leaveRequestId: string,
  status: 'approved' | 'rejected',
  comments?: string
): Promise<void> {
  const supabase = await createClient();

  // Get leave request with employee details
  const { data: leaveRequest, error } = await supabase
    .from('leave_requests')
    .select(
      '*, employees(id, email, first_name, company_id), leave_types(name)'
    )
    .eq('id', leaveRequestId)
    .single();

  if (error || !leaveRequest) {
    throw new Error('Leave request not found');
  }

  const employee = leaveRequest.employees as {
    id: string;
    email: string;
    first_name: string;
    company_id: string;
  };
  const leaveType = leaveRequest.leave_types as { name: string };

  if (!employee?.email) return;

  const statusText = status === 'approved' ? 'Approved' : 'Rejected';
  const notificationType: NotificationType =
    status === 'approved' ? 'leave_approved' : 'leave_rejected';

  await queueNotification({
    companyId: employee.company_id,
    type: notificationType,
    recipientEmail: employee.email,
    recipientId: employee.id,
    subject: `Leave Request ${statusText}`,
    body: `
Dear ${employee.first_name},

Your ${leaveType.name} request from ${leaveRequest.start_date} to ${leaveRequest.end_date} has been ${statusText.toLowerCase()}.

${comments ? `Comments: ${comments}` : ''}

Best regards,
HR Team
    `.trim(),
    metadata: {
      leave_request_id: leaveRequestId,
      status,
      leave_type: leaveType.name,
    },
  });
}

/**
 * Queue task assignment notification
 */
export async function queueTaskAssignedNotification(
  taskId: string
): Promise<void> {
  const supabase = await createClient();

  // Get task with employee details
  const { data: task, error } = await supabase
    .from('tasks')
    .select(
      '*, employees!tasks_assigned_to_fkey(id, email, first_name), assigner:employees!tasks_assigned_by_fkey(first_name, last_name)'
    )
    .eq('id', taskId)
    .single();

  if (error || !task) {
    throw new Error('Task not found');
  }

  const assignee = task.employees as {
    id: string;
    email: string;
    first_name: string;
  };
  const assigner = task.assigner as { first_name: string; last_name: string };

  if (!assignee?.email) return;

  await queueNotification({
    companyId: task.company_id,
    type: 'task_assigned',
    recipientEmail: assignee.email,
    recipientId: assignee.id,
    subject: `New Task Assigned: ${task.title}`,
    body: `
Dear ${assignee.first_name},

You have been assigned a new task by ${assigner?.first_name || 'your manager'}.

Task: ${task.title}
Priority: ${task.priority}
Due Date: ${task.due_date || 'Not specified'}

${task.description ? `Description: ${task.description}` : ''}

Please log into the HR portal to view and update the task status.

Best regards,
HR Team
    `.trim(),
    metadata: {
      task_id: taskId,
      priority: task.priority,
      due_date: task.due_date,
    },
  });
}

/**
 * Queue approval pending notification
 */
export async function queueApprovalPendingNotification(
  approverEmail: string,
  approverId: string,
  companyId: string,
  entityType: string,
  entityDescription: string
): Promise<void> {
  await queueNotification({
    companyId,
    type: 'approval_pending',
    recipientEmail: approverEmail,
    recipientId: approverId,
    subject: `Approval Required: ${entityDescription}`,
    body: `
You have a pending approval request that requires your attention.

Type: ${entityType}
Details: ${entityDescription}

Please log into the HR portal to review and take action.

Best regards,
HR System
    `.trim(),
    metadata: {
      entity_type: entityType,
    },
  });
}

/**
 * Get pending notifications
 */
export async function getPendingNotifications(
  limit: number = 50
): Promise<NotificationQueueItem[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('notification_queue')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to fetch pending notifications: ${error.message}`);
  }

  return data as NotificationQueueItem[];
}

/**
 * Mark notification as sent
 */
export async function markNotificationSent(notificationId: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('notification_queue')
    .update({
      status: 'sent',
      sent_at: new Date().toISOString(),
    })
    .eq('id', notificationId);

  if (error) {
    throw new Error(`Failed to mark notification as sent: ${error.message}`);
  }
}

/**
 * Mark notification as failed
 */
export async function markNotificationFailed(
  notificationId: string,
  errorMessage: string
): Promise<void> {
  const supabase = await createClient();

  // Get current retry count
  const { data: notification } = await supabase
    .from('notification_queue')
    .select('retry_count')
    .eq('id', notificationId)
    .single();

  const retryCount = (notification?.retry_count || 0) + 1;
  const maxRetries = 3;

  const { error } = await supabase
    .from('notification_queue')
    .update({
      status: retryCount >= maxRetries ? 'failed' : 'pending',
      error_message: errorMessage,
      retry_count: retryCount,
    })
    .eq('id', notificationId);

  if (error) {
    throw new Error(`Failed to mark notification as failed: ${error.message}`);
  }
}
