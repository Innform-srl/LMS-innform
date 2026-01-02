import { db } from '../lib/db'

async function checkUser() {
    console.log('🔍 Checking test@innform.com user...\n')

    try {
        const user = await db.user.findUnique({
            where: { email: 'test@innform.com' },
            include: {
                enrollments: {
                    include: {
                        course: {
                            select: { title: true }
                        }
                    }
                }
            }
        })

        if (!user) {
            console.log('❌ User NOT FOUND in database!')
            console.log('   The script may have failed silently.')
            return
        }

        console.log('✅ User EXISTS in database:')
        console.log(`   ID: ${user.id}`)
        console.log(`   Email: ${user.email}`)
        console.log(`   Name: ${user.name}`)
        console.log(`   Role: ${user.role}`)
        console.log(`   Password Hash: ${user.password?.substring(0, 20)}...`)
        console.log(`   Created: ${user.createdAt}`)
        console.log(`   Updated: ${user.updatedAt}`)

        if (user.enrollments.length > 0) {
            console.log(`\n📚 Enrollments: ${user.enrollments.length}`)
            user.enrollments.forEach(e => {
                console.log(`   - ${e.course.title}`)
            })
        } else {
            console.log('\n📝 No enrollments')
        }

        // Try to verify password
        const bcrypt = require('bcryptjs')
        const isPasswordValid = await bcrypt.compare('password', user.password || '')

        console.log(`\n🔑 Password Test:`)
        console.log(`   Password "password" is ${isPasswordValid ? 'VALID ✅' : 'INVALID ❌'}`)

        if (!isPasswordValid) {
            console.log('\n⚠️  PASSWORD MISMATCH! Resetting...')
            const newHash = await bcrypt.hash('password', 10)
            await db.user.update({
                where: { email: 'test@innform.com' },
                data: { password: newHash }
            })
            console.log('✅ Password reset to "password"')
        }

    } catch (error) {
        console.error('❌ Error:', error)
    }
}

checkUser()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error)
        process.exit(1)
    })
