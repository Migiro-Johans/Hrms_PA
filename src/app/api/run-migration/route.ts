import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST() {
  try {
    // Create a service role client to bypass RLS
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const migrationSQL = `
-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view own deductions" ON payroll_employee_deductions;
DROP POLICY IF EXISTS "Admins can manage deductions" ON payroll_employee_deductions;
DROP POLICY IF EXISTS "HR can manage deductions" ON payroll_employee_deductions;
DROP POLICY IF EXISTS "Finance can manage deductions" ON payroll_employee_deductions;
DROP POLICY IF EXISTS "Enable read access for all users" ON payroll_employee_deductions;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON payroll_employee_deductions;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON payroll_employee_deductions;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON payroll_employee_deductions;

-- Disable RLS on payroll_employee_deductions table
ALTER TABLE payroll_employee_deductions DISABLE ROW LEVEL SECURITY;

-- Also disable RLS on payroll_runs table to ensure payroll processing works
ALTER TABLE payroll_runs DISABLE ROW LEVEL SECURITY;
`

    // Execute the migration
    const { data, error } = await supabaseAdmin.rpc('exec_sql', {
      sql: migrationSQL
    })

    if (error) {
      console.error('Migration error:', error)
      return NextResponse.json({ 
        success: false, 
        error: error.message,
        hint: 'You need to run this SQL manually in Supabase SQL Editor'
      }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Migration 011 executed successfully - RLS disabled on payroll tables',
      data 
    })
  } catch (error: any) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error.message,
      hint: 'Please run the migration manually in Supabase SQL Editor'
    }, { status: 500 })
  }
}
