import { db } from '../lib/db'

async function getCourses() {
  const courses = await db.course.findMany({
    where: { published: true },
    select: { id: true, title: true },
    take: 10
  })
  console.log('Corsi pubblicati disponibili:')
  courses.forEach(c => console.log('  ID:', c.id, '| Titolo:', c.title))
  await db.$disconnect()
}

getCourses().catch(console.error)
