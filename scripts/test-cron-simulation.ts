import { db } from '../lib/db'

async function testCronLogic() {
    console.log('🧪 Starting Cron Job Simulation...\n')

    // 1. Setup Test Data
    console.log('📝 Creating test data...')
    const testEmail = `cron_test_${Date.now()}@innform.com`

    const user = await db.user.create({
        data: {
            email: testEmail,
            name: 'Cron Test User',
            role: 'EMPLOYEE'
        }
    })

    const course = await db.course.create({
        data: {
            title: 'Cron Test Course',
            description: 'Temporary course for testing notifications'
        }
    })

    const now = new Date()

    // Date: 3 Days from now
    const date3Days = new Date(now)
    date3Days.setDate(date3Days.getDate() + 3)

    // Date: 1 Day from now
    const date1Day = new Date(now)
    date1Day.setDate(date1Day.getDate() + 1)

    // Date: Overdue (yesterday)
    const dateOverdue = new Date(now)
    dateOverdue.setDate(dateOverdue.getDate() - 1)

    // Create Enrollments
    await db.enrollment.createMany({
        data: [
            { userId: user.id, courseId: course.id, dueDate: date3Days, completed: false }, // Should trigger 3_DAYS
            // We need separate courses or logic if we want multiple enrollments for same user/course, 
            // but schema has @@unique([userId, courseId]). 
            // So we'll create 3 separate courses for simplicity or just 1 enrollment per run?
            // Let's create 3 separate courses to be safe and easy.
        ]
    })

    // Actually, let's create 3 courses to avoid unique constraint issues
    const course2 = await db.course.create({ data: { title: 'Cron Test Course 2' } })
    const course3 = await db.course.create({ data: { title: 'Cron Test Course 3' } })

    await db.enrollment.create({
        data: { userId: user.id, courseId: course2.id, dueDate: date1Day, completed: false }
    })

    await db.enrollment.create({
        data: { userId: user.id, courseId: course3.id, dueDate: dateOverdue, completed: false }
    })

    console.log('✅ Test data created.')

    // 2. Simulate Queries (Copied from route.ts)
    console.log('\n🔍 Running queries...')

    // --- 3 DAYS CHECK ---
    const threeDaysFromNow = new Date()
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3)
    threeDaysFromNow.setHours(0, 0, 0, 0)

    const threeDaysEnd = new Date(threeDaysFromNow)
    threeDaysEnd.setHours(23, 59, 59, 999)

    const enrollments3Days = await db.enrollment.findMany({
        where: {
            completed: false,
            dueDate: {
                gte: threeDaysFromNow,
                lte: threeDaysEnd
            },
            reminders: {
                none: { type: '3_DAYS' }
            },
            user: { email: testEmail } // Filter for our test user
        },
        include: { course: true }
    })

    console.log(`\n[3 DAYS REMINDER] Found: ${enrollments3Days.length}`)
    enrollments3Days.forEach(e => console.log(` - Course: ${e.course.title}, Due: ${e.dueDate}`))

    // --- 1 DAY CHECK ---
    const oneDayFromNow = new Date()
    oneDayFromNow.setDate(oneDayFromNow.getDate() + 1)
    oneDayFromNow.setHours(0, 0, 0, 0)

    const oneDayEnd = new Date(oneDayFromNow)
    oneDayEnd.setHours(23, 59, 59, 999)

    const enrollments1Day = await db.enrollment.findMany({
        where: {
            completed: false,
            dueDate: {
                gte: oneDayFromNow,
                lte: oneDayEnd
            },
            reminders: {
                none: { type: '1_DAY' }
            },
            user: { email: testEmail }
        },
        include: { course: true }
    })

    console.log(`\n[1 DAY REMINDER] Found: ${enrollments1Day.length}`)
    enrollments1Day.forEach(e => console.log(` - Course: ${e.course.title}, Due: ${e.dueDate}`))

    // --- OVERDUE CHECK ---
    const overdueEnrollments = await db.enrollment.findMany({
        where: {
            completed: false,
            dueDate: {
                lt: new Date()
            },
            reminders: {
                none: { type: 'OVERDUE' }
            },
            user: { email: testEmail }
        },
        include: { course: true }
    })

    console.log(`\n[OVERDUE REMINDER] Found: ${overdueEnrollments.length}`)
    overdueEnrollments.forEach(e => console.log(` - Course: ${e.course.title}, Due: ${e.dueDate}`))

    // 3. Cleanup
    console.log('\n🧹 Cleaning up...')
    await db.enrollment.deleteMany({ where: { userId: user.id } })
    await db.course.delete({ where: { id: course.id } })
    await db.course.delete({ where: { id: course2.id } })
    await db.course.delete({ where: { id: course3.id } })
    await db.user.delete({ where: { id: user.id } })
    console.log('✅ Cleanup complete.')
}

testCronLogic()
    .then(() => process.exit(0))
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
