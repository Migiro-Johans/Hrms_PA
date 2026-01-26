#!/usr/bin/env node
/**
 * Simple Database Check Script
 * Uses direct REST API calls with service role key
 *
 * Usage: node scripts/db-check.mjs
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Load .env.local manually
const envPath = path.resolve(__dirname, '..', '.env.local')
const envContent = fs.readFileSync(envPath, 'utf-8')
const env = {}
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/)
  if (match && !line.startsWith('#')) {
    env[match[1].trim()] = match[2].trim()
  }
})

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing environment variables in .env.local')
  process.exit(1)
}

async function query(table, options = {}) {
  const url = new URL(`${SUPABASE_URL}/rest/v1/${table}`)

  if (options.select) {
    url.searchParams.set('select', options.select)
  }
  if (options.limit) {
    url.searchParams.set('limit', options.limit)
  }

  const response = await fetch(url.toString(), {
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': options.count ? 'count=exact' : 'return=representation',
    },
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Query failed: ${response.status} - ${error}`)
  }

  const data = await response.json()
  const count = response.headers.get('content-range')

  return { data, count }
}

async function main() {
  console.log('🔌 Testing Supabase Connection...\n')
  console.log(`URL: ${SUPABASE_URL}`)
  console.log('─'.repeat(60))

  try {
    // Test users table
    console.log('\n📋 Users:')
    const { data: users } = await query('users', {
      select: 'id,email,role,created_at',
      limit: 10
    })
    console.table(users.map(u => ({
      email: u.email,
      role: u.role,
      created: new Date(u.created_at).toLocaleDateString()
    })))

    // Test companies table
    console.log('\n🏢 Companies:')
    const { data: companies } = await query('companies', {
      select: 'id,name,created_at',
      limit: 5
    })
    console.table(companies.map(c => ({
      name: c.name,
      created: new Date(c.created_at).toLocaleDateString()
    })))

    // Test employees table
    console.log('\n👥 Employees:')
    const { data: employees } = await query('employees', {
      select: 'id,first_name,last_name,staff_id,status',
      limit: 10
    })
    console.table(employees.map(e => ({
      name: `${e.first_name} ${e.last_name}`,
      staff_id: e.staff_id,
      status: e.status
    })))

    // Test payroll_runs table
    console.log('\n💰 Payroll Runs:')
    const { data: payrolls } = await query('payroll_runs', {
      select: 'id,month,year,status',
      limit: 5
    })
    if (payrolls.length > 0) {
      console.table(payrolls)
    } else {
      console.log('  No payroll runs found')
    }

    // Test workflow_definitions table
    console.log('\n📝 Workflow Definitions:')
    const { data: workflows } = await query('workflow_definitions', {
      select: 'id,name,entity_type,is_active',
      limit: 10
    })
    if (workflows.length > 0) {
      console.table(workflows)
    } else {
      console.log('  No workflow definitions found')
    }

    console.log('\n✅ Connection successful!')
    console.log('─'.repeat(60))

  } catch (error) {
    console.error('\n❌ Error:', error.message)
    process.exit(1)
  }
}

main()
