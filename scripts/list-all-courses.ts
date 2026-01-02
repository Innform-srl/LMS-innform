import { db } from '../lib/db'

async function listCourses() {
    const courses = await db.course.findMany({
        include: {
            _count: {
                select: { modules: true }
            }
        }
    })
    console.log('Courses found:', courses.map(c => ({ title: c.title, id: c.id, modules: c._count.modules })))
}

listCourses()
    .then(() => process.exit(0))
    .catch(console.error)
