// Workflow Service - Approval workflow management

import { createClient } from '@/lib/supabase/server';
import type {
  ApprovalRequest,
  ApprovalAction,
  WorkflowDefinition,
  Employee,
  UserRole,
} from '@/types';

export type WorkflowEntityType = 'leave' | 'per_diem' | 'payroll' | 'promotion';

export interface CreateApprovalRequestParams {
  companyId: string;
  entityType: WorkflowEntityType;
  entityId: string;
  requesterId: string;
  metadata?: Record<string, unknown>;
}

export interface ProcessApprovalParams {
  requestId: string;
  approverId: string;
  action: 'approved' | 'rejected';
  comments?: string;
}

/**
 * Get the workflow definition for an entity type
 */
export async function getWorkflowDefinition(
  companyId: string,
  entityType: WorkflowEntityType
): Promise<WorkflowDefinition | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('workflow_definitions')
    .select('*')
    .eq('company_id', companyId)
    .eq('entity_type', entityType)
    .eq('is_active', true)
    .single();

  if (error || !data) {
    return null;
  }

  return data as WorkflowDefinition;
}

/**
 * Create a new approval request
 */
export async function createApprovalRequest(
  params: CreateApprovalRequestParams
): Promise<ApprovalRequest> {
  const supabase = await createClient();

  const { companyId, entityType, entityId, requesterId, metadata = {} } = params;

  // Get the workflow definition
  const workflow = await getWorkflowDefinition(companyId, entityType);

  const { data, error } = await supabase
    .from('approval_requests')
    .insert({
      company_id: companyId,
      workflow_id: workflow?.id,
      entity_type: entityType,
      entity_id: entityId,
      requester_id: requesterId,
      current_step: 1,
      status: 'pending',
      metadata,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create approval request: ${error.message}`);
  }

  // Sync entity status if it's a payroll run
  if (entityType === 'payroll') {
    await supabase
      .from('payroll_runs')
      .update({ status: 'hr_pending' }) // Initial state for payroll workflow
      .eq('id', entityId);
  }

  return data as ApprovalRequest;
}

/**
 * Process an approval (approve or reject)
 */
export async function processApproval(
  params: ProcessApprovalParams
): Promise<ApprovalRequest> {
  const supabase = await createClient();

  const { requestId, approverId, action, comments } = params;

  // Get the current request with workflow
  const { data: request, error: requestError } = await supabase
    .from('approval_requests')
    .select('*, workflow_definitions(*)')
    .eq('id', requestId)
    .single();

  if (requestError || !request) {
    throw new Error('Approval request not found');
  }

  if (request.status !== 'pending') {
    throw new Error('This request has already been processed');
  }

  const workflow = request.workflow_definitions as WorkflowDefinition;
  const currentStep = request.current_step;

  // Record the approval action
  const { error: actionError } = await supabase.from('approval_actions').insert({
    request_id: requestId,
    step_number: currentStep,
    approver_id: approverId,
    action,
    comments,
  });

  if (actionError) {
    throw new Error(`Failed to record approval action: ${actionError.message}`);
  }

  // Determine the new status
  let newStatus: string;
  let newStep = currentStep;

  if (action === 'rejected') {
    newStatus = 'rejected';
  } else {
    // Check if there are more steps
    const steps = workflow?.steps || [];
    const requiredStepsRemaining = steps.filter(
      (s) => s.order > currentStep && s.required
    );

    if (requiredStepsRemaining.length > 0) {
      // Move to next step
      newStep = currentStep + 1;
      newStatus = 'pending';
    } else {
      // All steps complete
      newStatus = 'approved';
    }
  }

  // Update the request
  const { data: updatedRequest, error: updateError } = await supabase
    .from('approval_requests')
    .update({
      current_step: newStep,
      status: newStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', requestId)
    .select()
    .single();

  if (updateError) {
    throw new Error(`Failed to update approval request: ${updateError.message}`);
  }

  // Sync entity status
  if (request.entity_type === 'payroll') {
    let payrollStatus: string = '';

    if (newStatus === 'rejected') {
      payrollStatus = currentStep === 1 ? 'hr_rejected' : 'mgmt_rejected';
    } else if (newStatus === 'approved') {
      payrollStatus = 'approved';
    } else {
      // Pending next step
      payrollStatus = newStep === 2 ? 'hr_pending' : 'mgmt_pending';
    }

    if (payrollStatus) {
      await supabase
        .from('payroll_runs')
        .update({
          status: payrollStatus,
          rejection_comments: action === 'rejected' ? comments : null
        })
        .eq('id', request.entity_id);
    }
  }

  return updatedRequest as ApprovalRequest;
}

/**
 * Get approval status for an entity
 */
export async function getApprovalStatus(
  entityType: string,
  entityId: string
): Promise<ApprovalRequest | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('approval_requests')
    .select('*, approval_actions(*, employees(first_name, last_name))')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    return null;
  }

  return data as ApprovalRequest;
}

/**
 * Get pending approvals for a user based on their role
 */
export async function getPendingApprovalsForUser(
  companyId: string,
  userId: string,
  userRole: UserRole,
  employeeId?: string,
  isLineManager?: boolean
): Promise<ApprovalRequest[]> {
  const supabase = await createClient();

  // Get all pending requests for the company
  const { data: requests, error } = await supabase
    .from('approval_requests')
    .select(
      '*, workflow_definitions(*), employees!approval_requests_requester_id_fkey(first_name, last_name, manager_id, department_id)'
    )
    .eq('company_id', companyId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error || !requests) {
    return [];
  }

  // Filter based on the current step and user's role
  const pendingForUser = requests.filter((request) => {
    const workflow = request.workflow_definitions as WorkflowDefinition;
    const currentStep = workflow?.steps?.find(
      (s) => s.order === request.current_step
    );

    if (!currentStep) return false;

    // Check if this step is for the user's role
    if (currentStep.role === userRole) return true;

    // Check if this step is for line manager and user is the requester's manager
    if (currentStep.role === 'line_manager' && isLineManager && employeeId) {
      const requester = request.employees as Employee;
      return requester?.manager_id === employeeId;
    }

    // Admin can see all
    if (userRole === 'admin') return true;

    return false;
  });

  return pendingForUser as ApprovalRequest[];
}

/**
 * Cancel an approval request (by the requester)
 */
export async function cancelApprovalRequest(
  requestId: string,
  requesterId: string
): Promise<void> {
  const supabase = await createClient();

  const { data: request, error: fetchError } = await supabase
    .from('approval_requests')
    .select('*')
    .eq('id', requestId)
    .eq('requester_id', requesterId)
    .single();

  if (fetchError || !request) {
    throw new Error('Approval request not found or you do not have permission');
  }

  if (request.status !== 'pending') {
    throw new Error('Cannot cancel a request that is not pending');
  }

  const { error: updateError } = await supabase
    .from('approval_requests')
    .update({
      status: 'cancelled',
      updated_at: new Date().toISOString(),
    })
    .eq('id', requestId);

  if (updateError) {
    throw new Error(`Failed to cancel request: ${updateError.message}`);
  }
}

/**
 * Get approval history for an entity
 */
export async function getApprovalHistory(
  entityType: string,
  entityId: string
): Promise<ApprovalAction[]> {
  const supabase = await createClient();

  const { data: request, error: requestError } = await supabase
    .from('approval_requests')
    .select('id')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .single();

  if (requestError || !request) {
    return [];
  }

  const { data: actions, error: actionsError } = await supabase
    .from('approval_actions')
    .select('*, employees(first_name, last_name)')
    .eq('request_id', request.id)
    .order('created_at', { ascending: true });

  if (actionsError) {
    return [];
  }

  return actions as ApprovalAction[];
}

/**
 * Check if user can approve a request at its current step
 */
export async function canUserApprove(
  requestId: string,
  userRole: UserRole,
  employeeId?: string,
  isLineManager?: boolean
): Promise<boolean> {
  const supabase = await createClient();

  const { data: request, error } = await supabase
    .from('approval_requests')
    .select(
      '*, workflow_definitions(*), employees!approval_requests_requester_id_fkey(manager_id)'
    )
    .eq('id', requestId)
    .single();

  if (error || !request) {
    return false;
  }

  if (request.status !== 'pending') {
    return false;
  }

  const workflow = request.workflow_definitions as WorkflowDefinition;
  const currentStep = workflow?.steps?.find(
    (s) => s.order === request.current_step
  );

  if (!currentStep) return false;

  // Admin can always approve
  if (userRole === 'admin') return true;

  // Check role match
  if (currentStep.role === userRole) return true;

  // Check line manager
  if (currentStep.role === 'line_manager' && isLineManager && employeeId) {
    const requester = request.employees as Employee;
    return requester?.manager_id === employeeId;
  }

  return false;
}
