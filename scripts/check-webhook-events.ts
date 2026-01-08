import { db } from '../lib/db'

async function check() {
  // Check webhook events for lucia
  const events = await db.webhookEvent.findMany({
    where: {
      OR: [
        { requestPayload: { path: ['email'], string_contains: 'lucia' } },
        { requestPayload: { path: ['user', 'email'], string_contains: 'lucia' } },
      ]
    },
    orderBy: { createdAt: 'desc' },
    take: 5
  })

  console.log('Webhook events for lucia:', events.length)
  events.forEach(e => {
    console.log('---')
    console.log('Source:', e.source)
    console.log('Type:', e.eventType)
    console.log('Status:', e.status)
    console.log('Created:', e.createdAt)
    console.log('Payload:', JSON.stringify(e.requestPayload, null, 2))
  })

  await db.$disconnect()
}

check().catch(console.error)
