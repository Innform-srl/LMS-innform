import { db } from "./lib/db"

async function checkEnrollmentTime() {
    const enrollments = await db.enrollment.findMany({
        include: {
            course: {
                select: {
                    title: true,
                    minimumDuration: true
                }
            },
            user: {
                select: {
                    email: true
                }
            }
        },
        orderBy: {
            timeSpent: 'desc'
        },
        take: 10
    })

    console.log("Top 10 Enrollments by Time Spent:")
    enrollments.forEach(e => {
        const hours = Math.floor(e.timeSpent / 3600)
        const minutes = Math.floor((e.timeSpent % 3600) / 60)
        const seconds = e.timeSpent % 60

        console.log(`\n${e.user.email} - ${e.course.title}`)
        console.log(`Time Spent: ${hours}h ${minutes}m ${seconds}s (${e.timeSpent} seconds)`)
        console.log(`Course Min Duration: ${e.course.minimumDuration} minutes`)
        console.log(`Progress: ${e.progress}%`)
    })

    await db.$disconnect()
}

checkEnrollmentTime()
