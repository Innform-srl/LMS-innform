import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Non autorizzato" },
        { status: 401 }
      )
    }

    const { userId } = await params

    // Prevent admin from deleting themselves
    if (session.user.id === userId) {
      return NextResponse.json(
        { error: "Non puoi eliminare il tuo account" },
        { status: 400 }
      )
    }

    // Check if user exists and has EduPlan enrollments
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        enrollments: {
          where: {
            tmsEnrollmentId: { not: null }
          },
          select: {
            id: true,
            tmsEnrollmentId: true,
            course: { select: { title: true } }
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: "Utente non trovato" },
        { status: 404 }
      )
    }

    // Block deletion if user has active EduPlan enrollments
    if (user.enrollments.length > 0) {
      const courseNames = user.enrollments.map(e => e.course?.title || 'Corso sconosciuto').join(', ')
      return NextResponse.json(
        {
          error: `Impossibile eliminare: l'utente ha ${user.enrollments.length} iscrizione/i attiva/e da EduPlan (${courseNames}). Elimina prima l'iscrizione da EduPlan.`,
          eduplanEnrollments: user.enrollments.length
        },
        { status: 400 }
      )
    }

    // Delete user and all related data (cascades handled by Prisma schema)
    await db.user.delete({
      where: { id: userId }
    })

    console.log(`[ADMIN] User ${user.email} deleted by ${session.user.email}`)

    return NextResponse.json({
      success: true,
      message: "Utente eliminato con successo"
    })

  } catch (error) {
    console.error("[ADMIN] Error deleting user:", error)
    return NextResponse.json(
      { error: "Errore durante l'eliminazione dell'utente" },
      { status: 500 }
    )
  }
}
