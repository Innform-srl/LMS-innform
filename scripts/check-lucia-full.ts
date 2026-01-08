import { db } from '../lib/db'

async function check() {
  const user = await db.user.findUnique({
    where: { email: 'lucia.bibbo@tiscali.it' },
  })
  console.log('User created at:', user?.createdAt)
  console.log('Name:', user?.name)

  // Check all recent webhook events
  const allEvents = await db.webhookEvent.findMany({
    where: { createdAt: { gte: new Date('2026-01-07T17:00:00Z') } },
    orderBy: { createdAt: 'desc' },
    take: 10
  })

  console.log('\nRecent webhook events:')
  allEvents.forEach(e => {
    console.log('-', e.createdAt, e.source, e.eventType, e.status)
  })

  await db.$disconnect()
}

check().catch(console.error)
