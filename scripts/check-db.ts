import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function checkDatabase() {
  console.log('=== DATABASE CHECK ===\n')

  // Check companies
  const { data: companies, error: companiesError } = await supabase
    .from('companies')
    .select('id, name')

  console.log('COMPANIES:')
  if (companiesError) {
    console.log('Error:', companiesError.message)
  } else {
    companies?.forEach(c => console.log(`  - ${c.name} (${c.id})`))
    console.log(`  Total: ${companies?.length || 0}`)
  }

  // Check users
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, email, role, company_id, employee_id')

  console.log('\nUSERS:')
  if (usersError) {
    console.log('Error:', usersError.message)
  } else {
    users?.forEach(u => console.log(`  - ${u.email} | role: ${u.role} | company_id: ${u.company_id} | employee_id: ${u.employee_id || 'null'}`))
    console.log(`  Total: ${users?.length || 0}`)
  }

  // Check employees
  const { data: employees, error: employeesError } = await supabase
    .from('employees')
    .select('id, staff_id, first_name, last_name, email, company_id, status')

  console.log('\nEMPLOYEES:')
  if (employeesError) {
    console.log('Error:', employeesError.message)
  } else {
    employees?.forEach(e => console.log(`  - ${e.staff_id}: ${e.first_name} ${e.last_name} | email: ${e.email || 'null'} | company_id: ${e.company_id} | status: ${e.status}`))
    console.log(`  Total: ${employees?.length || 0}`)
  }

  // Cross-reference: employees per company
  console.log('\nEMPLOYEES PER COMPANY:')
  const companyMap = new Map<string, string>()
  companies?.forEach(c => companyMap.set(c.id, c.name))

  const employeesByCompany = new Map<string, number>()
  employees?.forEach(e => {
    const count = employeesByCompany.get(e.company_id) || 0
    employeesByCompany.set(e.company_id, count + 1)
  })

  employeesByCompany.forEach((count, companyId) => {
    const companyName = companyMap.get(companyId) || 'Unknown'
    console.log(`  - ${companyName}: ${count} employees`)
  })

  // Check auth users
  const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()

  console.log('\nAUTH USERS:')
  if (authError) {
    console.log('Error:', authError.message)
  } else {
    authUsers?.users?.forEach(u => console.log(`  - ${u.email} (${u.id})`))
    console.log(`  Total: ${authUsers?.users?.length || 0}`)
  }
}

checkDatabase().catch(console.error)
