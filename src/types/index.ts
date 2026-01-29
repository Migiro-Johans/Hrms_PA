// Database Types for Meridian Kapital Human resource system

// =====================================================
// USER ROLES
// =====================================================

export type UserRole = 'employee' | 'hr' | 'finance' | 'management' | 'admin';

// =====================================================
// CORE ENTITIES
// =====================================================

export interface Company {
  id: string;
  name: string;
  kra_pin?: string;
  nssf_number?: string;
  nhif_number?: string;
  address?: string;
  email?: string;
  phone?: string;
  logo_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Department {
  id: string;
  company_id: string;
  name: string;
  line_manager_id?: string;
  objectives: DepartmentObjective[];
  kpis: DepartmentKPI[];
  created_at: string;
  // Joined data
  line_manager?: Employee;
}

export interface DepartmentObjective {
  id: string;
  title: string;
  description: string;
  target_date: string;
  status: 'pending' | 'in_progress' | 'completed';
}

export interface DepartmentKPI {
  id: string;
  name: string;
  target: number;
  unit: string;
  current_value?: number;
}

export interface PayGrade {
  id: string;
  company_id: string;
  pay_group: string;
  pay_grade: string;
  basic_salary?: number;
  created_at: string;
}

export interface Employee {
  id: string;
  company_id: string;
  department_id?: string;
  pay_grade_id?: string;
  manager_id?: string;
  is_line_manager: boolean;
  staff_id: string;
  first_name: string;
  last_name: string;
  middle_name?: string;
  gender?: string;
  email?: string;
  phone?: string;
  employment_date: string;
  termination_date?: string;
  job_role?: string;
  kra_pin?: string;
  nssf_number?: string;
  nhif_number?: string;
  bank_name?: string;
  bank_branch?: string;
  account_number?: string;
  status: 'active' | 'terminated' | 'suspended' | 'on_leave';
  created_at: string;
  updated_at: string;
  // Joined data
  department?: Department;
  pay_grade?: PayGrade;
  salary_structure?: SalaryStructure;
  manager?: Employee;
  direct_reports?: Employee[];
}

export interface SalaryStructure {
  id: string;
  employee_id: string;
  basic_salary: number;
  car_allowance: number;
  meal_allowance: number;
  telephone_allowance: number;
  housing_allowance: number;
  other_allowances: Record<string, number>;
  effective_date: string;
  created_at: string;
}

export interface RecurringDeduction {
  id: string;
  employee_id: string;
  deduction_type: string;
  description?: string;
  amount: number;
  start_date: string;
  end_date?: string;
  is_active: boolean;
  created_at: string;
}

// =====================================================
// PAYROLL
// =====================================================

export type PayrollStatus = 'draft' | 'processing' | 'finance_pending' | 'finance_rejected' | 'mgmt_pending' | 'mgmt_rejected' | 'approved' | 'paid';

export interface PayrollRun {
  id: string;
  company_id: string;
  month: number;
  year: number;
  status: PayrollStatus;
  processed_by?: string;
  approved_by?: string;
  processed_at?: string;
  approved_at?: string;
  hr_approved_by?: string;
  hr_approved_at?: string;
  finance_approved_by?: string;
  finance_approved_at?: string;
  management_approved_by?: string;
  management_approved_at?: string;
  paid_at?: string;
  notification_sent_at?: string;
  rejection_comments?: string;
  notes?: string;
  created_at: string;
  // Computed
  payslips?: Payslip[];
  total_gross?: number;
  total_net?: number;
  total_paye?: number;
  employee_count?: number;
}

export interface Payslip {
  id: string;
  payroll_run_id: string;
  employee_id: string;

  // Earnings
  basic_salary: number;
  car_allowance: number;
  meal_allowance: number;
  telephone_allowance: number;
  housing_allowance: number;
  other_earnings: Record<string, number>;
  gross_pay: number;

  // Days
  calendar_days?: number;
  days_worked?: number;

  // Statutory Deductions
  nssf_employee: number;
  nssf_employer: number;
  shif_employee: number;
  ahl_employee: number;
  ahl_employer: number;

  // Tax Calculation
  taxable_pay: number;
  income_tax: number;
  personal_relief: number;
  insurance_relief: number;
  paye: number;

  // Other Deductions
  helb: number;
  other_deductions: Record<string, number>;
  total_deductions: number;

  // Net
  net_pay: number;

  // Employer Costs
  nita: number;
  cost_to_company: number;

  created_at: string;

  // Joined data
  employee?: Employee;
  payroll_run?: PayrollRun;
}

// G9 Record (formerly P9 - Kenya tax deduction card)
export interface G9Record {
  id: string;
  employee_id: string;
  year: number;
  month: number;
  basic_salary: number;
  benefits_noncash: number;
  value_of_quarters: number;
  total_gross_pay: number;
  defined_contribution_30_percent: number;
  defined_contribution_actual: number;
  defined_contribution_fixed: number;
  owner_occupied_interest: number;
  retirement_contribution_total: number;
  chargeable_pay: number;
  tax_charged: number;
  personal_relief: number;
  insurance_relief: number;
  paye_tax: number;
  created_at: string;
}

// Alias for backwards compatibility
export type P9Record = G9Record;

// =====================================================
// USER
// =====================================================

export interface User {
  id: string;
  email: string;
  company_id?: string;
  role: UserRole;
  employee_id?: string;
  created_at: string;
  // Joined data
  company?: Company;
  employee?: Employee;
}

// =====================================================
// AUDIT LOGGING
// =====================================================

export interface AuditLog {
  id: string;
  company_id: string;
  user_id?: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE' | 'APPROVE' | 'REJECT';
  table_name: string;
  record_id: string;
  old_values?: Record<string, unknown>;
  new_values?: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
  is_critical: boolean;
  created_at: string;
  // Joined data
  user?: User;
}

// =====================================================
// APPROVAL WORKFLOW
// =====================================================

export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface WorkflowStep {
  order: number;
  role: UserRole | 'line_manager';
  action: string;
  required: boolean;
}

export interface WorkflowDefinition {
  id: string;
  company_id: string;
  name: string;
  entity_type: 'leave' | 'per_diem' | 'payroll' | 'promotion';
  steps: WorkflowStep[];
  is_active: boolean;
  created_at: string;
}

export interface ApprovalRequest {
  id: string;
  company_id: string;
  workflow_id?: string;
  entity_type: string;
  entity_id: string;
  requester_id: string;
  current_step: number;
  status: ApprovalStatus;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  // Joined data
  workflow?: WorkflowDefinition;
  requester?: Employee;
  actions?: ApprovalAction[];
}

export interface ApprovalAction {
  id: string;
  request_id: string;
  step_number: number;
  approver_id: string;
  action: 'approved' | 'rejected';
  comments?: string;
  created_at: string;
  // Joined data
  approver?: Employee;
}

// =====================================================
// LEAVE MANAGEMENT
// =====================================================

export interface LeaveType {
  id: string;
  company_id: string;
  name: string;
  days_per_year: number;
  is_paid: boolean;
  requires_approval: boolean;
  carry_over_days: number;
  gender_specific?: 'male' | 'female';
  created_at: string;
}

export interface LeaveBalance {
  id: string;
  employee_id: string;
  leave_type_id: string;
  year: number;
  entitled_days: number;
  used_days: number;
  carried_over: number;
  created_at: string;
  updated_at: string;
  // Computed
  available_days?: number;
  // Joined data
  leave_type?: LeaveType;
}

export type LeaveRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface LeaveRequest {
  id: string;
  employee_id: string;
  leave_type_id: string;
  start_date: string;
  end_date: string;
  days_requested: number;
  reason?: string;
  status: LeaveRequestStatus;
  line_manager_approved_by?: string;
  line_manager_approved_at?: string;
  hr_approved_by?: string;
  hr_approved_at?: string;
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
  // Joined data
  employee?: Employee;
  leave_type?: LeaveType;
  line_manager_approver?: Employee;
  hr_approver?: Employee;
}

// =====================================================
// PER DIEM MANAGEMENT
// =====================================================

export type DestinationType = 'local' | 'regional' | 'international';

export interface PerDiemRate {
  id: string;
  company_id: string;
  name: string;
  destination_type: DestinationType;
  daily_rate: number;
  accommodation_rate: number;
  transport_rate: number;
  effective_date: string;
  is_active: boolean;
  created_at: string;
}

export type PerDiemRequestStatus = 'pending' | 'approved' | 'rejected' | 'paid';

export interface PerDiemRequest {
  id: string;
  employee_id: string;
  rate_id?: string;
  destination: string;
  purpose: string;
  start_date: string;
  end_date: string;
  days: number;
  daily_rate: number;
  accommodation_amount: number;
  transport_amount: number;
  total_amount: number;
  status: PerDiemRequestStatus;
  line_manager_approved_by?: string;
  line_manager_approved_at?: string;
  finance_approved_by?: string;
  finance_approved_at?: string;
  management_approved_by?: string;
  management_approved_at?: string;
  paid_at?: string;
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
  // Joined data
  employee?: Employee;
  rate?: PerDiemRate;
}

// =====================================================
// TASK MANAGEMENT
// =====================================================

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

export interface Task {
  id: string;
  company_id: string;
  department_id?: string;
  assigned_to: string;
  assigned_by?: string;
  title: string;
  description?: string;
  priority: TaskPriority;
  status: TaskStatus;
  due_date?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
  // Joined data
  assignee?: Employee;
  assigner?: Employee;
  department?: Department;
  comments?: TaskComment[];
}

export interface TaskComment {
  id: string;
  task_id: string;
  author_id: string;
  content: string;
  created_at: string;
  // Joined data
  author?: Employee;
}

// =====================================================
// PERFORMANCE MANAGEMENT
// =====================================================

export type ReviewCycleStatus = 'draft' | 'active' | 'completed';

export interface ReviewCycle {
  id: string;
  company_id: string;
  name: string;
  start_date: string;
  end_date: string;
  status: ReviewCycleStatus;
  created_at: string;
}

export type PerformanceReviewStatus = 'pending' | 'self_review' | 'manager_review' | 'completed';

export interface PerformanceReview {
  id: string;
  cycle_id: string;
  employee_id: string;
  reviewer_id?: string;
  self_assessment: Record<string, unknown>;
  manager_assessment: Record<string, unknown>;
  overall_rating?: number; // 1.00 to 5.00
  strengths?: string;
  areas_for_improvement?: string;
  goals_for_next_period: ReviewGoal[];
  status: PerformanceReviewStatus;
  completed_at?: string;
  created_at: string;
  updated_at: string;
  // Joined data
  employee?: Employee;
  reviewer?: Employee;
  cycle?: ReviewCycle;
  kpis?: EmployeeKPI[];
}

export interface ReviewGoal {
  id: string;
  title: string;
  description?: string;
  target_date?: string;
}

export interface EmployeeKPI {
  id: string;
  employee_id: string;
  cycle_id: string;
  name: string;
  description?: string;
  target_value?: number;
  actual_value?: number;
  unit?: string;
  weight: number;
  rating?: number;
  created_at: string;
}

// =====================================================
// PROMOTION MANAGEMENT
// =====================================================

export type PromotionStatus = 'pending' | 'approved' | 'rejected';

export interface PromotionRequest {
  id: string;
  employee_id: string;
  suggested_by?: string;
  current_job_role?: string;
  proposed_job_role: string;
  current_pay_grade_id?: string;
  proposed_pay_grade_id?: string;
  proposed_salary?: number;
  justification: string;
  performance_review_id?: string;
  effective_date?: string;
  status: PromotionStatus;
  approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
  // Joined data
  employee?: Employee;
  suggester?: Employee;
  approver?: Employee;
  current_pay_grade?: PayGrade;
  proposed_pay_grade?: PayGrade;
  performance_review?: PerformanceReview;
}

// =====================================================
// DEPARTMENT DOCUMENTS
// =====================================================

export type DocumentType = 'policy' | 'sop' | 'guideline';

export interface DepartmentDocument {
  id: string;
  department_id: string;
  type: DocumentType;
  title: string;
  content?: string;
  file_url?: string;
  version: string;
  is_active: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
  // Joined data
  department?: Department;
  creator?: Employee;
}

// =====================================================
// NOTIFICATIONS
// =====================================================

export type NotificationType =
  | 'payslip_ready'
  | 'leave_approved'
  | 'leave_rejected'
  | 'per_diem_approved'
  | 'per_diem_rejected'
  | 'task_assigned'
  | 'approval_pending'
  | 'promotion_approved'
  | 'promotion_rejected';

export type NotificationStatus = 'pending' | 'sent' | 'failed';

export interface NotificationQueueItem {
  id: string;
  company_id: string;
  type: NotificationType;
  recipient_email: string;
  recipient_id?: string;
  subject: string;
  body: string;
  metadata: Record<string, unknown>;
  status: NotificationStatus;
  sent_at?: string;
  error_message?: string;
  retry_count: number;
  created_at: string;
}

// =====================================================
// INPUT TYPES FOR CALCULATIONS
// =====================================================

export interface PayrollInput {
  basic_salary: number;
  car_allowance?: number;
  meal_allowance?: number;
  telephone_allowance?: number;
  housing_allowance?: number;
  other_allowances?: Record<string, number>;
  other_deductions?: Record<string, number>;
  helb?: number;
  insurance_premium?: number;
  calendar_days?: number;
  days_worked?: number;
}

export interface PayrollCalculation {
  // Earnings
  basic_salary: number;
  car_allowance: number;
  meal_allowance: number;
  telephone_allowance: number;
  housing_allowance: number;
  other_earnings: Record<string, number>;
  gross_pay: number;

  // Statutory Deductions
  nssf_employee: number;
  nssf_employer: number;
  shif_employee: number;
  ahl_employee: number;
  ahl_employer: number;

  // Tax
  taxable_pay: number;
  income_tax: number;
  personal_relief: number;
  insurance_relief: number;
  paye: number;

  // Other
  helb: number;
  other_deductions: Record<string, number>;
  total_deductions: number;

  // Net
  net_pay: number;

  // Employer
  nita: number;
  cost_to_company: number;
}

// =====================================================
// CSV IMPORT TYPES
// =====================================================

export interface EmployeeCSVRow {
  'Staff ID': string;
  'First Name': string;
  'Last Name': string;
  'Middle Name'?: string;
  'Gender'?: string;
  'Employment Date': string;
  'Pay Group'?: string;
  'Pay Grade'?: string;
  'Department'?: string;
  'Job Role'?: string;
  'NSSF Number'?: string;
  'NHIF Number'?: string;
  'KRA PIN'?: string;
  'Bank Name'?: string;
  'Account Number'?: string;
  'Basic Salary'?: string;
  'Car Allowance'?: string;
  'Meal Allowance'?: string;
  'Telephone Allowance'?: string;
}

// =====================================================
// API RESPONSE TYPES
// =====================================================

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

// =====================================================
// DASHBOARD STATISTICS
// =====================================================

export interface DashboardStats {
  // Employee Stats
  total_employees: number;
  active_employees: number;
  departments_count: number;

  // Payroll Stats
  latest_payroll?: PayrollRun;
  total_gross_pay: number;
  total_net_pay: number;
  total_paye: number;

  // Leave Stats
  pending_leave_requests: number;
  approved_leave_this_month: number;

  // Task Stats
  pending_tasks: number;
  overdue_tasks: number;

  // Performance Stats (for management)
  top_performers?: Employee[];
  best_departments?: { department: Department; average_rating: number }[];
}

export interface PendingApprovals {
  leave_requests: LeaveRequest[];
  per_diem_requests: PerDiemRequest[];
  payroll_runs: PayrollRun[];
  promotion_requests: PromotionRequest[];
}
