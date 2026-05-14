import { createClient } from '@supabase/supabase-js'
import { PrismaClient } from '@prisma/client'

const EMAIL = 'juampiacosta158@gmail.com'
const PASSWORD = '123456'
const DISPLAY_NAME = 'Juampi'
const CLIENTS = [{ name: 'Santo', slug: 'santo' }]

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) throw new Error('Missing Supabase env vars')

  const supabase = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const prisma = new PrismaClient()

  // 1) Reuse existing user if present, else create one
  const { data: list, error: listErr } = await supabase.auth.admin.listUsers({ perPage: 1000 })
  if (listErr) throw listErr
  let user = list.users.find((u) => u.email?.toLowerCase() === EMAIL.toLowerCase())

  if (!user) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: EMAIL,
      password: PASSWORD,
      email_confirm: true,
    })
    if (error) throw error
    user = data.user!
    console.log(`Created auth user ${user.id}`)
  } else {
    console.log(`Auth user already exists: ${user.id} — updating password`)
    const { error } = await supabase.auth.admin.updateUserById(user.id, {
      password: PASSWORD,
      email_confirm: true,
    })
    if (error) throw error
  }

  // 2) Upsert client + profile as ADMIN
  const client = await prisma.client.upsert({
    where: { slug: CLIENTS[0].slug },
    create: { name: CLIENTS[0].name, slug: CLIENTS[0].slug },
    update: { name: CLIENTS[0].name },
  })
  console.log(`  ✓ Client ${CLIENTS[0].name} (${client.id})`)

  await prisma.profile.upsert({
    where: { id: user.id },
    create: {
      id: user.id,
      email: user.email ?? null,
      displayName: DISPLAY_NAME,
      role: 'ADMIN',
      clientId: client.id,
    },
    update: { role: 'ADMIN', email: user.email ?? null, displayName: DISPLAY_NAME, clientId: client.id },
  })
  console.log('Profile upserted as ADMIN')

  await prisma.$disconnect()
  console.log('\nDone. Sign in with:')
  console.log(`  email:    ${EMAIL}`)
  console.log(`  password: ${PASSWORD}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
