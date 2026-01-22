// Kenya Payroll Constants (2024/2025)

import type { UserRole } from '@/types';

// =====================================================
// TAX AND STATUTORY DEDUCTIONS
// =====================================================

// PAYE Tax Bands (Monthly)
export const PAYE_TAX_BANDS = [
  { min: 0, max: 24000, rate: 0.10 },
  { min: 24001, max: 32333, rate: 0.25 },
  { min: 32334, max: 500000, rate: 0.30 },
  { min: 500001, max: 800000, rate: 0.325 },
  { min: 800001, max: Infinity, rate: 0.35 },
] as const;

// NSSF Rates (New NSSF Act)
export const NSSF = {
  TIER_I_LIMIT: 7000, // KES 7,000
  TIER_II_UPPER_LIMIT: 36000, // KES 36,000
  RATE: 0.06, // 6%
  MAX_EMPLOYEE_CONTRIBUTION: 2160, // Max employee contribution per month
  MAX_EMPLOYER_CONTRIBUTION: 2160, // Max employer contribution per month
} as const;

// SHA/SHIF (Social Health Insurance Fund) - Replacing NHIF
export const SHIF = {
  RATE: 0.0275, // 2.75% of gross salary
} as const;

// Affordable Housing Levy
export const AHL = {
  EMPLOYEE_RATE: 0.015, // 1.5% of gross salary
  EMPLOYER_RATE: 0.015, // 1.5% of gross salary
} as const;

// Personal Relief
export const PERSONAL_RELIEF = {
  MONTHLY: 2400, // KES 2,400 per month
  ANNUAL: 28800, // KES 28,800 per year
} as const;

// Insurance Relief
export const INSURANCE_RELIEF = {
  RATE: 0.15, // 15% of premiums paid
  MAX_MONTHLY: 5000, // KES 5,000 per month
  MAX_ANNUAL: 60000, // KES 60,000 per year
} as const;

// NITA (National Industrial Training Authority) - Employer only
export const NITA = {
  MONTHLY_PER_EMPLOYEE: 50, // KES 50 per employee per month
} as const;

// Retirement Contribution Limits (for G9/P9)
export const RETIREMENT = {
  MAX_MONTHLY: 20000, // KES 20,000 per month
  MAX_ANNUAL: 240000, // KES 240,000 per year
} as const;

// Owner Occupied Interest (for G9/P9)
export const OWNER_OCCUPIED_INTEREST = {
  MAX_MONTHLY: 25000, // KES 25,000 per month
  MAX_ANNUAL: 300000, // KES 300,000 per year
} as const;

// =====================================================
// GENERAL CONSTANTS
// =====================================================

// Months
export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
] as const;

// Pay Groups
export const PAY_GROUPS = [
  'CEO',
  'Sr. Manager',
  'Manager',
  'Executive',
  'Specialist',
  'Associate',
  'Intern',
] as const;

// Employee Status
export const EMPLOYEE_STATUS = [
  'active',
  'terminated',
  'suspended',
  'on_leave',
] as const;

// =====================================================
// USER ROLES AND PERMISSIONS
// =====================================================

// User Roles (updated for new platform)
export const USER_ROLES: readonly UserRole[] = [
  'admin',
  'hr',
  'finance',
  'management',
  'employee',
] as const;

// Role display names
export const ROLE_DISPLAY_NAMES: Record<UserRole, string> = {
  admin: 'Administrator',
  hr: 'Human Resources',
  finance: 'Finance',
  management: 'Management',
  employee: 'Employee',
};

// Role permissions map
export const ROLE_PERMISSIONS = {
  employee: {
    dashboard: ['read'],
    payslips: ['read:own'],
    g9_forms: ['read:own', 'download:own'],
    leave: ['create:own', 'read:own', 'cancel:own'],
    per_diem: ['create:own', 'read:own', 'cancel:own'],
    tasks: ['read:own', 'update:own'],
    profile: ['read:own', 'update:own'],
  },
  hr: {
    dashboard: ['read'],
    employees: ['create', 'read', 'update'],
    departments: ['read', 'update'],
    payroll: ['read', 'approve'],
    payslips: ['read'],
    g9_forms: ['read', 'download'],
    leave: ['read', 'approve:final'],
    per_diem: ['read'],
    tasks: ['read'],
    performance: ['create', 'read', 'update'],
    promotions: ['create', 'read'],
    audit: ['read'],
  },
  finance: {
    dashboard: ['read'],
    employees: ['read'],
    payroll: ['create', 'read', 'update', 'process'],
    payslips: ['create', 'read', 'update'],
    g9_forms: ['read', 'download'],
    salary_structures: ['create', 'read', 'update'],
    per_diem: ['read', 'approve'],
    per_diem_rates: ['create', 'read', 'update'],
    reports: ['read', 'generate'],
  },
  management: {
    dashboard: ['read:all'],
    employees: ['read'],
    departments: ['read'],
    payroll: ['read', 'approve:final'],
    payslips: ['read'],
    g9_forms: ['read'],
    leave: ['read', 'approve:final'],
    per_diem: ['read', 'approve:final'],
    tasks: ['read'],
    performance: ['read:all'],
    promotions: ['read', 'approve'],
    statistics: ['read'],
  },
  admin: {
    '*': ['*'], // Full access to everything
  },
} as const;

// Line manager permissions (applies when employee.is_line_manager = true)
export const LINE_MANAGER_PERMISSIONS = {
  employees: ['read:department'],
  leave: ['read:department', 'approve:department'],
  per_diem: ['read:department', 'approve:department'],
  tasks: ['create:department', 'read:department', 'update:department', 'delete:department'],
  objectives: ['create:department', 'read:department', 'update:department'],
  kpis: ['create:department', 'read:department', 'update:department'],
  documents: ['create:department', 'read:department', 'update:department', 'delete:department'],
  performance: ['read:department', 'create:department'],
} as const;

// =====================================================
// PAYROLL STATUS
// =====================================================

// Payroll Run Status (updated for multi-step approval)
export const PAYROLL_STATUS = [
  'draft',
  'processing',
  'hr_pending',
  'hr_rejected',
  'mgmt_pending',
  'mgmt_rejected',
  'approved',
  'paid',
] as const;

export const PAYROLL_STATUS_DISPLAY: Record<string, { label: string; color: string }> = {
  draft: { label: 'Draft', color: 'gray' },
  processing: { label: 'Processing', color: 'blue' },
  hr_pending: { label: 'Awaiting HR Approval', color: 'yellow' },
  hr_rejected: { label: 'Rejected by HR', color: 'red' },
  mgmt_pending: { label: 'Awaiting Management Approval', color: 'yellow' },
  mgmt_rejected: { label: 'Rejected by Management', color: 'red' },
  approved: { label: 'Approved', color: 'green' },
  paid: { label: 'Paid', color: 'emerald' },
};

// =====================================================
// LEAVE TYPES (KENYA STATUTORY)
// =====================================================

export const DEFAULT_LEAVE_TYPES = [
  { name: 'Annual Leave', days_per_year: 21, is_paid: true, carry_over_days: 5 },
  { name: 'Sick Leave', days_per_year: 30, is_paid: true, carry_over_days: 0 },
  { name: 'Maternity Leave', days_per_year: 90, is_paid: true, carry_over_days: 0, gender_specific: 'female' },
  { name: 'Paternity Leave', days_per_year: 14, is_paid: true, carry_over_days: 0, gender_specific: 'male' },
  { name: 'Compassionate Leave', days_per_year: 5, is_paid: true, carry_over_days: 0 },
] as const;

export const LEAVE_REQUEST_STATUS = [
  'pending',
  'approved',
  'rejected',
  'cancelled',
] as const;

export const LEAVE_STATUS_DISPLAY: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pending', color: 'yellow' },
  approved: { label: 'Approved', color: 'green' },
  rejected: { label: 'Rejected', color: 'red' },
  cancelled: { label: 'Cancelled', color: 'gray' },
};

// =====================================================
// PER DIEM
// =====================================================

export const DESTINATION_TYPES = [
  'local',
  'regional',
  'international',
] as const;

export const DESTINATION_TYPE_DISPLAY: Record<string, string> = {
  local: 'Local (Within Kenya)',
  regional: 'Regional (East Africa)',
  international: 'International',
};

export const PER_DIEM_REQUEST_STATUS = [
  'pending',
  'approved',
  'rejected',
  'paid',
] as const;

// =====================================================
// TASKS
// =====================================================

export const TASK_PRIORITIES = [
  'low',
  'medium',
  'high',
  'urgent',
] as const;

export const TASK_PRIORITY_DISPLAY: Record<string, { label: string; color: string }> = {
  low: { label: 'Low', color: 'gray' },
  medium: { label: 'Medium', color: 'blue' },
  high: { label: 'High', color: 'orange' },
  urgent: { label: 'Urgent', color: 'red' },
};

export const TASK_STATUS = [
  'pending',
  'in_progress',
  'completed',
  'cancelled',
] as const;

export const TASK_STATUS_DISPLAY: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pending', color: 'gray' },
  in_progress: { label: 'In Progress', color: 'blue' },
  completed: { label: 'Completed', color: 'green' },
  cancelled: { label: 'Cancelled', color: 'red' },
};

// =====================================================
// PERFORMANCE REVIEWS
// =====================================================

export const REVIEW_CYCLE_STATUS = [
  'draft',
  'active',
  'completed',
] as const;

export const PERFORMANCE_REVIEW_STATUS = [
  'pending',
  'self_review',
  'manager_review',
  'completed',
] as const;

export const RATING_LABELS: Record<number, string> = {
  1: 'Needs Improvement',
  2: 'Below Expectations',
  3: 'Meets Expectations',
  4: 'Exceeds Expectations',
  5: 'Outstanding',
};

// =====================================================
// PROMOTIONS
// =====================================================

export const PROMOTION_STATUS = [
  'pending',
  'approved',
  'rejected',
] as const;

// =====================================================
// DEDUCTIONS
// =====================================================

export const DEDUCTION_TYPES = [
  'HELB',
  'Loan',
  'Sacco',
  'Advance',
  'Other',
] as const;

// =====================================================
// APPROVAL WORKFLOWS
// =====================================================

export const WORKFLOW_ENTITY_TYPES = [
  'leave',
  'per_diem',
  'payroll',
  'promotion',
] as const;

export const APPROVAL_STATUS = [
  'pending',
  'approved',
  'rejected',
  'cancelled',
] as const;

// =====================================================
// NOTIFICATIONS
// =====================================================

export const NOTIFICATION_TYPES = [
  'payslip_ready',
  'leave_approved',
  'leave_rejected',
  'per_diem_approved',
  'per_diem_rejected',
  'task_assigned',
  'approval_pending',
  'promotion_approved',
  'promotion_rejected',
] as const;

// =====================================================
// AUDIT
// =====================================================

export const AUDIT_ACTIONS = [
  'INSERT',
  'UPDATE',
  'DELETE',
  'APPROVE',
  'REJECT',
] as const;

export const CRITICAL_TABLES = [
  'payroll_runs',
  'payslips',
  'salary_structures',
] as const;
