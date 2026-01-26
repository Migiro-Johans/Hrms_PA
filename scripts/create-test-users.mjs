#!/usr/bin/env node
/**
 * Create Test Users Script
 * Creates auth users and links them to the users table
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Load .env.local
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

// Test users to create
const TEST_USERS = [
  { email: 'admin@test.com', role: 'admin', password: 'Test123!' },
  { email: 'hr@test.com', role: 'hr', password: 'Test123!' },
  { email: 'finance@test.com', role: 'finance', password: 'Test123!' },
  { email: 'management@test.com', role: 'management', password: 'Test123!' },
  { email: 'employee@test.com', role: 'employee', password: 'Test123!' },
]

async function getCompanyId() {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/companies?select=id&limit=1`, {
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
    },
  })
  const data = await response.json()
  return data[0]?.id
}

async function checkExistingUser(email) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/users?email=eq.${encodeURIComponent(email)}&select=id,email,role`, {
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
    },
  })
  const data = await response.json()
  return data[0] || null
}

async function getAuthUserByEmail(email) {
  // List all auth users and find by email
  const response = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
    },
  })

  if (!response.ok) return null

  const data = await response.json()
  const users = data.users || data || []
  return users.find(u => u.email === email)
}

async function createAuthUser(email, password) {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
    }),
  })

  const data = await response.json()

  if (!response.ok) {
    // If user already exists, try to get their ID
    if (data.message?.includes('already been registered') || data.msg?.includes('already been registered')) {
      const existingAuthUser = await getAuthUserByEmail(email)
      if (existingAuthUser) {
        return { user: { id: existingAuthUser.id }, existing: true }
      }
    }
    throw new Error(data.message || data.msg || data.error || 'Failed to create auth user')
  }

  // Handle both response formats
  const userId = data.user?.id || data.id
  if (!userId) {
    console.log('   Auth response:', JSON.stringify(data, null, 2))
    throw new Error('No user ID in response')
  }

  return { user: { id: userId } }
}

async function createUserProfile(id, email, role, companyId) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/users`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
    },
    body: JSON.stringify({
      id,
      email,
      role,
      company_id: companyId,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to create user profile: ${error}`)
  }

  return response.json()
}

async function updateUserRole(email, role) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/users?email=eq.${encodeURIComponent(email)}`, {
    method: 'PATCH',
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
    },
    body: JSON.stringify({ role }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to update user role: ${error}`)
  }

  return response.json()
}

async function main() {
  console.log('🔐 Creating Test Users...\n')
  console.log('─'.repeat(60))

  const companyId = await getCompanyId()
  if (!companyId) {
    console.error('❌ No company found in database')
    process.exit(1)
  }
  console.log(`Using company_id: ${companyId}\n`)

  for (const user of TEST_USERS) {
    console.log(`\n📧 Processing ${user.email}...`)

    try {
      // Check if user exists in users table
      const existingUser = await checkExistingUser(user.email)

      if (existingUser) {
        // User exists, check if role matches
        if (existingUser.role === user.role) {
          console.log(`   ✓ Already exists with role: ${user.role}`)
        } else {
          // Update role
          await updateUserRole(user.email, user.role)
          console.log(`   ✓ Updated role: ${existingUser.role} → ${user.role}`)
        }
        continue
      }

      // Create or get auth user
      console.log(`   Creating/fetching auth user...`)
      const authResult = await createAuthUser(user.email, user.password)

      // Create user profile
      console.log(`   Creating user profile...`)
      await createUserProfile(authResult.user.id, user.email, user.role, companyId)

      if (authResult.existing) {
        console.log(`   ✓ Linked existing auth user with role: ${user.role}`)
      } else {
        console.log(`   ✓ Created with role: ${user.role}`)
      }

    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`)
    }
  }

  console.log('\n' + '─'.repeat(60))
  console.log('\n✅ Done! Test user credentials:\n')
  console.table(TEST_USERS.map(u => ({ email: u.email, password: u.password, role: u.role })))
}

main()
