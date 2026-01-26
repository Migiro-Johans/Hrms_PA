import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function updateHRUser() {
  // Update HR user's company_id to My Company
  const { data, error } = await supabase
    .from('users')
    .update({ company_id: 'c9d089fe-c1a1-4fb1-b49f-eb7c1392d583' })
    .eq('email', 'hr@test.com')
    .select()

  if (error) {
    console.log('Error:', error.message)
  } else {
    console.log('Updated HR user to My Company:', data)
  }

  // Verify the update
  const { data: users } = await supabase
    .from('users')
    .select('email, role, company_id')
    .eq('email', 'hr@test.com')

  console.log('\nVerification:', users)
}

updateHRUser().catch(console.error)
