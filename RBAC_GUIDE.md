# Role-Based Access Control Implementation Guide

## Overview
Your payroll system now has a complete role-based access control (RBAC) system where:
- Everyone starts as an **employee** by default
- **Admin** can assign roles to users
- Each role sees a different dashboard with appropriate access

## Roles & Permissions

### 1. Employee (Default Role)
**Access:**
- ✅ Dashboard (personal)
- ✅ My Tasks
- ✅ Leave (apply, view own)
- ✅ Per Diem (request, view own)
- ✅ My Payslips

**Description:** Self-service access to personal information and requests

---

### 2. HR
**Access:**
- ✅ All Employee features
- ✅ Employees (manage all employees)
- ✅ Departments
- ✅ Payroll (view, assist)
- ✅ Performance (manage reviews)
- ✅ Promotions
- ✅ Reports
- ✅ Audit Log
- ✅ Leave Approvals
- ✅ Per Diem Approvals

**Description:** Manage employees, departments, performance reviews, and approvals

---

### 3. Finance
**Access:**
- ✅ All Employee features
- ✅ Payroll (full access - process, approve)
- ✅ Per Diem (manage rates, approvals)
- ✅ Reports (financial)
- ✅ Salary Structures
- ✅ Deductions

**Description:** Manage payroll processing, per diem rates, and financial reports

---

### 4. Management
**Access:**
- ✅ All Employee features
- ✅ Departments (view)
- ✅ Payroll (view)
- ✅ Performance (oversee)
- ✅ Promotions (approve)
- ✅ Reports (all)
- ✅ Final Approvals

**Description:** Oversight of operations, final approvals, and strategic reporting

---

### 5. Admin (Super User)
**Access:**
- ✅ Everything (all features)
- ✅ User Management (assign roles)
- ✅ Settings
- ✅ Audit Log
- ✅ System Configuration

**Description:** Full system access - can assign roles and access all features

---

### 6. Line Manager (Special Permission)
In addition to their base role, line managers can:
- ✅ View their department's data
- ✅ Approve leave for their team
- ✅ Approve per diem for their team
- ✅ Manage tasks for their team
- ✅ Conduct performance reviews for their team

---

## Setup Instructions

### Step 1: Run Database Migrations

1. Open your **Supabase Dashboard** → SQL Editor
2. Run the migrations in order:

**Migration 008 - Role-Based RLS Policies:**
```sql
-- Copy and paste the contents of: supabase/migrations/008_role_based_rls.sql
-- This enables proper row-level security for all tables
```

**Migration 009 - Seed First Admin:**
```sql
-- Copy the contents of: supabase/migrations/009_seed_admin.sql
-- IMPORTANT: Change line 8 to your email:
--   v_user_email TEXT := 'your-email@example.com';
-- Then run it
```

### Step 2: Log Out and Log In
After running the migrations:
1. **Log out** of your current session
2. **Clear browser cache** (Cmd+Shift+Delete on Mac, Ctrl+Shift+Delete on Windows)
3. **Log back in** with your admin account
4. You should now see all sections in the sidebar

### Step 3: Access User Management
1. Navigate to **Settings** → **Users**
2. You'll see all users in your company
3. Click the dropdown next to each user to change their role
4. Roles update immediately - no logout required for role changes

---

## How It Works

### Authentication Flow
```
1. User registers → auth.users table entry created
2. Trigger fires → public.users profile created with role='employee'
3. User logs in → sees employee dashboard (5 sections)
4. Admin assigns role → user.role updated in database
5. User refreshes page → sees appropriate dashboard
```

### Database Security (RLS Policies)
Each table has Row Level Security policies that check:
- User's role (`admin`, `hr`, `finance`, `management`, `employee`)
- User's company ID (multi-tenant isolation)
- Employee ID (for personal data access)
- Line manager status (for team oversight)

### Sidebar Filtering
The sidebar automatically shows/hides sections based on:
```typescript
// src/components/sidebar.tsx
const filteredNavigation = navigation.filter((item) => {
  // Admin sees everything
  if (userRole === "admin") return true
  
  // Check if user's role is in allowed roles
  if (item.roles.includes(userRole)) return true
  
  // Line managers get extra access
  if (isLineManager && item.roles.includes("line_manager")) return true
  
  return false
})
```

---

## Role Assignment UI

### For Admins:
1. Go to **Settings** → **Users**
2. You'll see a table with all users
3. Each user has:
   - Name and email
   - Employee info (number, position)
   - Current role badge
   - Role assignment dropdown
4. Select new role from dropdown
5. Change takes effect immediately

### Role Cards at Top:
- Shows count for each role
- Visual indicators with icons
- Quick overview of team structure

---

## Testing Different Roles

### Test Admin View:
1. Assign your account `admin` role
2. Refresh page
3. Should see: Dashboard, My Tasks, Leave, Per Diem, My Payslips, **Employees**, **Departments**, **Payroll**, **Performance**, **Promotions**, **Reports**, **Audit Log**, **Settings**

### Test HR View:
1. Create test user or change existing user to `hr` role
2. Should see: Dashboard, My Tasks, Leave, Per Diem, My Payslips, **Employees**, **Departments**, **Payroll**, **Performance**, **Promotions**, **Reports**, **Audit Log**

### Test Finance View:
1. Create test user or change existing user to `finance` role
2. Should see: Dashboard, My Tasks, Leave, Per Diem, My Payslips, **Payroll**, **Reports**

### Test Management View:
1. Create test user or change existing user to `management` role
2. Should see: Dashboard, My Tasks, Leave, Per Diem, My Payslips, **Departments**, **Payroll**, **Performance**, **Promotions**, **Reports**

### Test Employee View:
1. Create test user with default `employee` role
2. Should see: Dashboard, My Tasks, Leave, Per Diem, My Payslips (5 sections total)

---

## Troubleshooting

### User can't see role changes:
**Solution:** Have them log out and log back in (auth session needs refresh)

### Admin can't access User Management:
**Solution:**
1. Check database: `SELECT role FROM users WHERE email = 'your-email@example.com';`
2. Should be `admin`
3. If not, run migration 009 again with your email

### RLS policies blocking access:
**Solution:**
1. Check user's `company_id` matches the data they're trying to access
2. Verify user has `employee_id` linked (required for most features)
3. Check Supabase logs for policy violations

### User has no employee record:
**Solution:** Migration 009 auto-creates employee records. Run it for the user.

### Sidebar shows all sections to everyone:
**Solution:** Make sure you've pulled the latest code and deployed it (commit `ce33be2`)

---

## API Routes for User Management

### GET /api/admin/users
Returns list of employees without user accounts (for linking new users)

### POST /api/admin/users
Creates new user account
```json
{
  "email": "newuser@example.com",
  "password": "secure-password",
  "role": "employee",
  "employee_id": "uuid-of-employee"
}
```

---

## Security Features

1. **Multi-tenant Isolation:** Users can only see data from their company
2. **Role-based Access:** Database policies enforce role restrictions
3. **Employee Linkage:** Most features require valid employee record
4. **Line Manager Scope:** Line managers only see their department
5. **Audit Logging:** Admin and HR can view all system actions

---

## Next Steps

1. ✅ Run migration 008 (RLS policies)
2. ✅ Run migration 009 (seed your admin account)
3. ✅ Log out and log back in
4. ✅ Wait for Vercel deployment (1-2 minutes)
5. ✅ Test role assignment in Settings → Users
6. ✅ Create test users with different roles
7. ✅ Verify each role sees appropriate dashboard

---

## Default Access Matrix

| Feature | Employee | HR | Finance | Management | Admin |
|---------|----------|----|---------|-----------| ------|
| Dashboard | ✅ | ✅ | ✅ | ✅ | ✅ |
| My Tasks | ✅ | ✅ | ✅ | ✅ | ✅ |
| Leave | ✅ | ✅ | ✅ | ✅ | ✅ |
| Per Diem | ✅ | ✅ | ✅ | ✅ | ✅ |
| My Payslips | ✅ | ✅ | ✅ | ✅ | ✅ |
| Employees | ❌ | ✅ | ❌ | ❌ | ✅ |
| Departments | ❌ | ✅ | ❌ | ✅ | ✅ |
| Payroll | ❌ | ✅ | ✅ | ✅ | ✅ |
| Performance | ❌ | ✅ | ❌ | ✅ | ✅ |
| Promotions | ❌ | ✅ | ❌ | ✅ | ✅ |
| Reports | ❌ | ✅ | ✅ | ✅ | ✅ |
| Audit Log | ❌ | ✅ | ❌ | ❌ | ✅ |
| Settings | ❌ | ❌ | ❌ | ❌ | ✅ |

---

## Support

If you encounter issues:
1. Check Supabase logs for RLS policy violations
2. Verify user's role in database
3. Confirm employee_id linkage exists
4. Clear browser cache and retry
5. Check browser console for errors

Your system is now ready for production use with proper role-based access control! 🎉
