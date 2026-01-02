import { db } from '../lib/db'
import bcrypt from 'bcryptjs'

async function createTestEmployee() {
    console.log('🔧 Creating/Updating test employee user...\n')

    try {
        // Check if user exists
        const existing = await db.user.findUnique({
            where: { email: 'test@innform.com' }
        })

        const hashedPassword = await bcrypt.hash('password', 10)

        if (existing) {
            console.log('✅ User already exists, updating...')

            const updated = await db.user.update({
                where: { email: 'test@innform.com' },
                data: {
                    name: 'Test Employee',
                    password: hashedPassword,
                    role: 'EMPLOYEE'
                }
            })

            console.log('\n✅ User updated successfully!')
            console.log(`   Email: ${updated.email}`)
            console.log(`   Name: ${updated.name}`)
            console.log(`   Role: ${updated.role}`)
            console.log(`   Password: password`)
        } else {
            console.log('Creating new user...')

            const created = await db.user.create({
                data: {
                    email: 'test@innform.com',
                    name: 'Test Employee',
                    password: hashedPassword,
                    role: 'EMPLOYEE'
                }
            })

            console.log('\n✅ User created successfully!')
            console.log(`   Email: ${created.email}`)
            console.log(`   Name: ${created.name}`)
            console.log(`   Role: ${created.role}`)
            console.log(`   Password: password`)
        }

        // Check enrollments
        const enrollments = await db.enrollment.findMany({
            where: { user: { email: 'test@innform.com' } },
            include: { course: { select: { title: true } } }
        })

        if (enrollments.length > 0) {
            console.log(`\n📚 Enrolled in ${enrollments.length} course(s):`)
            enrollments.forEach(e => {
                console.log(`   - ${e.course.title} (Progress: ${e.progress}%)`)
            })
        } else {
            console.log('\n📝 Not enrolled in any courses yet')
            console.log('   Tip: You can enroll this user in courses from the admin panel')
        }

        console.log('\n🔑 Login Credentials:')
        console.log('   Email: test@innform.com')
        console.log('   Password: password')
        console.log('   Role: EMPLOYEE (can only view/take courses, cannot create them)')
        console.log('\n✨ Ready to test!')

    } catch (error) {
        console.error('❌ Error:', error)
        process.exit(1)
    }
}

createTestEmployee()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error)
        process.exit(1)
    })
