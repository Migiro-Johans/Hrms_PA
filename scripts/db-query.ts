#!/usr/bin/env npx tsx
/**
 * Database Query Script
 * Usage: npx tsx scripts/db-query.ts "SELECT * FROM users LIMIT 5"
 *
 * Uses your existing .env.local credentials
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables:')
  if (!supabaseUrl) console.error('  - NEXT_PUBLIC_SUPABASE_URL')
  if (!supabaseServiceKey) console.error('  - SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
  db: {
    schema: 'public',
  },
})

async function runQuery(sql: string) {
  console.log('\n📊 Running query...\n')
  console.log(`SQL: ${sql}\n`)
  console.log('─'.repeat(60))

  // For SELECT queries, we need to use RPC or direct table access
  // Let's use a simple approach with common queries

  if (sql.toLowerCase().includes('select')) {
    // Parse table name from simple SELECT queries
    const match = sql.match(/from\s+(\w+)/i)
    if (match) {
      const table = match[1]
      const { data, error } = await supabase.from(table).select('*').limit(10)

      if (error) {
        console.error('Error:', error.message)
        return
      }

      console.log(`Results from ${table}:`)
      console.table(data)
      console.log(`\nTotal rows returned: ${data?.length || 0}`)
    }
  }
}

async function testConnection() {
  console.log('🔌 Testing Supabase connection...\n')
  console.log(`URL: ${supabaseUrl}`)
  console.log('─'.repeat(60))

  // Test with users table
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, email, role')
    .limit(5)

  if (usersError) {
    console.error('❌ Connection failed:', usersError.message)
    return false
  }

  console.log('\n✅ Connection successful!\n')
  console.log('Users in database:')
  console.table(users)

  // Get counts
  const { count: userCount } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })

  const { count: employeeCount } = await supabase
    .from('employees')
    .select('*', { count: 'exact', head: true })

  const { count: companyCount } = await supabase
    .from('companies')
    .select('*', { count: 'exact', head: true })

  console.log('\n📈 Database Statistics:')
  console.log(`  Companies: ${companyCount || 0}`)
  console.log(`  Users: ${userCount || 0}`)
  console.log(`  Employees: ${employeeCount || 0}`)

  return true
}

// Main execution
const args = process.argv.slice(2)

if (args.length === 0 || args[0] === '--test') {
  testConnection()
} else {
  runQuery(args.join(' '))
}
