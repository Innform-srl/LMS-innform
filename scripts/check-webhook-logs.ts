import { db } from '../lib/db'

async function checkWebhookLogs() {
  const events = await db.webhookEvent.findMany({
    where: {
      source: 'eduplan',
      eventType: 'user_created'
    },
    orderBy: { createdAt: 'desc' },
    take: 5
  })

  console.log('Recent EduPlan user_created events:')
  for (const event of events) {
    console.log('---')
    console.log('ID:', event.id)
    console.log('Created:', event.createdAt)
    console.log('Status:', event.status)
    console.log('Request payload:', JSON.stringify(event.requestPayload, null, 2))
  }

  await db.$disconnect()
}

checkWebhookLogs().catch(console.error)
