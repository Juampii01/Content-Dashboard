import { createClient } from '@supabase/supabase-js'
import { PrismaClient } from '@prisma/client'

const SUPER_ADMIN_EMAIL = 'cristianortiz@astraire.com'
const INITIAL_CLIENTS = [
  { name: 'Cristian', slug: 'cristian' },
  { name: 'Jose', slug: 'jose' },
  { name: 'Santo', slug: 'santo' },
]

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env.')
    process.exit(1)
  }

  const supabase = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const prisma = new PrismaClient()

  console.log(`Looking up user ${SUPER_ADMIN_EMAIL}...`)
  const { data: list, error } = await supabase.auth.admin.listUsers({ perPage: 1000 })
  if (error) throw error

  const user = list.users.find((u) => u.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase())
  if (!user) {
    console.error(`User with email ${SUPER_ADMIN_EMAIL} not found in auth.users.`)
    console.error('Register first at /login, then rerun this script.')
    process.exit(1)
  }

  console.log(`Found user ${user.id}. Upserting Profile as SUPER_ADMIN...`)
  await prisma.profile.upsert({
    where: { id: user.id },
    create: {
      id: user.id,
      email: user.email ?? null,
      displayName: 'Cristian',
      globalRole: 'SUPER_ADMIN',
    },
    update: { globalRole: 'SUPER_ADMIN', email: user.email ?? null },
  })

  console.log('Upserting initial Clients...')
  for (const c of INITIAL_CLIENTS) {
    const client = await prisma.client.upsert({
      where: { slug: c.slug },
      create: { name: c.name, slug: c.slug },
      update: { name: c.name },
    })
    await prisma.clientAccess.upsert({
      where: { userId_clientId: { userId: user.id, clientId: client.id } },
      create: { userId: user.id, clientId: client.id, roleInClient: 'ACCESS' },
      update: {},
    })
    console.log(`  ✓ ${c.name} (${client.id})`)
  }

  console.log('Done.')
  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
