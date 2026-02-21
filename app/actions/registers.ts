"use server"

import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { AttendanceStatus, DeliveryMode, InstructorRole, RegisterStatus, RegisterType } from "@prisma/client"

// ============ CLASS REGISTER CRUD ============

export async function getRegisters(filters?: {
  status?: RegisterStatus
  registerType?: RegisterType
  courseId?: string
}) {
  const session = await auth()
  if (session?.user?.role !== "ADMIN" && session?.user?.role !== "TEACHER") return []

  return db.classRegister.findMany({
    where: {
      ...(filters?.status && { status: filters.status }),
      ...(filters?.registerType && { registerType: filters.registerType }),
      ...(filters?.courseId && { courseId: filters.courseId }),
    },
    include: {
      course: { select: { id: true, title: true } },
      _count: {
        select: {
          participants: true,
          entries: true,
          instructors: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  })
}

export async function getRegister(id: string) {
  const session = await auth()
  if (session?.user?.role !== "ADMIN" && session?.user?.role !== "TEACHER") return null

  return db.classRegister.findUnique({
    where: { id },
    include: {
      course: { select: { id: true, title: true } },
      entries: {
        orderBy: { date: "asc" },
        include: {
          _count: { select: { attendances: true } },
          instructorEntries: {
            include: { instructor: { select: { name: true, role: true } } },
          },
        },
      },
      participants: {
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
        orderBy: { user: { name: "asc" } },
      },
      instructors: {
        orderBy: { name: "asc" },
      },
    },
  })
}

export async function createRegister(data: {
  courseId: string
  title: string
  registerType: RegisterType
  plannedHours: number
  complianceThreshold?: number
  fundingBody?: string
  projectCode?: string
  editionCode?: string
  trainingLocation?: string
  notes?: string
}) {
  const session = await auth()
  if (session?.user?.role !== "ADMIN" && session?.user?.role !== "TEACHER") {
    return { success: false, error: "Non autorizzato" }
  }

  try {
    const register = await db.classRegister.create({
      data: {
        courseId: data.courseId,
        title: data.title,
        registerType: data.registerType,
        plannedHours: data.plannedHours,
        complianceThreshold: data.complianceThreshold ?? 70,
        fundingBody: data.fundingBody,
        projectCode: data.projectCode,
        editionCode: data.editionCode,
        trainingLocation: data.trainingLocation,
        notes: data.notes,
      },
    })

    revalidatePath("/admin/registers")
    return { success: true, registerId: register.id }
  } catch (error) {
    console.error("Error creating register:", error)
    return { success: false, error: "Errore durante la creazione del registro" }
  }
}

export async function updateRegister(
  id: string,
  data: {
    title?: string
    status?: RegisterStatus
    plannedHours?: number
    complianceThreshold?: number
    fundingBody?: string
    projectCode?: string
    editionCode?: string
    trainingLocation?: string
    notes?: string
  }
) {
  const session = await auth()
  if (session?.user?.role !== "ADMIN" && session?.user?.role !== "TEACHER") {
    return { success: false, error: "Non autorizzato" }
  }

  try {
    const register = await db.classRegister.findUnique({ where: { id } })
    if (!register) {
      return { success: false, error: "Registro non trovato" }
    }
    if (register.status === "CLOSED" || register.status === "ARCHIVED") {
      return { success: false, error: "Il registro e' chiuso e non puo' essere modificato" }
    }

    await db.classRegister.update({ where: { id }, data })

    revalidatePath(`/admin/registers/${id}`)
    revalidatePath("/admin/registers")
    return { success: true }
  } catch (error) {
    console.error("Error updating register:", error)
    return { success: false, error: "Errore durante l'aggiornamento" }
  }
}

export async function deleteRegister(id: string) {
  const session = await auth()
  if (session?.user?.role !== "ADMIN" && session?.user?.role !== "TEACHER") {
    return { success: false, error: "Non autorizzato" }
  }

  try {
    const register = await db.classRegister.findUnique({ where: { id } })
    if (!register) {
      return { success: false, error: "Registro non trovato" }
    }
    if (register.status !== "DRAFT") {
      return { success: false, error: "Solo i registri in bozza possono essere eliminati" }
    }

    await db.classRegister.delete({ where: { id } })

    revalidatePath("/admin/registers")
    return { success: true }
  } catch (error) {
    console.error("Error deleting register:", error)
    return { success: false, error: "Errore durante l'eliminazione" }
  }
}

// ============ REGISTER ENTRIES ============

export async function createEntry(data: {
  registerId: string
  date: Date
  startTime: Date
  endTime: Date
  pauseMinutes?: number
  topics: string
  deliveryMode: DeliveryMode
  liveSessionId?: string
  notes?: string
}) {
  const session = await auth()
  if (session?.user?.role !== "ADMIN" && session?.user?.role !== "TEACHER") {
    return { success: false, error: "Non autorizzato" }
  }

  try {
    const register = await db.classRegister.findUnique({ where: { id: data.registerId } })
    if (!register || register.status === "CLOSED" || register.status === "ARCHIVED") {
      return { success: false, error: "Registro non modificabile" }
    }

    const pause = data.pauseMinutes ?? 0
    const diffMs = new Date(data.endTime).getTime() - new Date(data.startTime).getTime()
    const effectiveHours = (diffMs / (1000 * 60) - pause) / 60

    const entry = await db.registerEntry.create({
      data: {
        registerId: data.registerId,
        date: data.date,
        startTime: data.startTime,
        endTime: data.endTime,
        pauseMinutes: pause,
        effectiveHours: Math.round(effectiveHours * 100) / 100,
        topics: data.topics,
        deliveryMode: data.deliveryMode,
        liveSessionId: data.liveSessionId,
        notes: data.notes,
      },
    })

    // Auto-fill attendance if linked to a live session
    if (data.liveSessionId) {
      await autoFillFromLiveSession(entry.id)
    }

    revalidatePath(`/admin/registers/${data.registerId}`)
    return { success: true, entryId: entry.id }
  } catch (error) {
    console.error("Error creating entry:", error)
    return { success: false, error: "Errore durante la creazione della giornata" }
  }
}

export async function updateEntry(
  entryId: string,
  data: {
    date?: Date
    startTime?: Date
    endTime?: Date
    pauseMinutes?: number
    topics?: string
    deliveryMode?: DeliveryMode
    notes?: string
  }
) {
  const session = await auth()
  if (session?.user?.role !== "ADMIN" && session?.user?.role !== "TEACHER") {
    return { success: false, error: "Non autorizzato" }
  }

  try {
    const entry = await db.registerEntry.findUnique({
      where: { id: entryId },
      include: { register: true },
    })
    if (!entry) return { success: false, error: "Giornata non trovata" }
    if (entry.register.status === "CLOSED" || entry.register.status === "ARCHIVED") {
      return { success: false, error: "Registro non modificabile" }
    }

    const startTime = data.startTime ?? entry.startTime
    const endTime = data.endTime ?? entry.endTime
    const pause = data.pauseMinutes ?? entry.pauseMinutes
    const diffMs = new Date(endTime).getTime() - new Date(startTime).getTime()
    const effectiveHours = (diffMs / (1000 * 60) - pause) / 60

    await db.registerEntry.update({
      where: { id: entryId },
      data: {
        ...data,
        effectiveHours: Math.round(effectiveHours * 100) / 100,
      },
    })

    revalidatePath(`/admin/registers/${entry.registerId}`)
    return { success: true }
  } catch (error) {
    console.error("Error updating entry:", error)
    return { success: false, error: "Errore durante l'aggiornamento" }
  }
}

export async function deleteEntry(entryId: string) {
  const session = await auth()
  if (session?.user?.role !== "ADMIN" && session?.user?.role !== "TEACHER") {
    return { success: false, error: "Non autorizzato" }
  }

  try {
    const entry = await db.registerEntry.findUnique({
      where: { id: entryId },
      include: { register: true },
    })
    if (!entry) return { success: false, error: "Giornata non trovata" }

    await db.registerEntry.delete({ where: { id: entryId } })

    // Recalculate participant hours
    await recalculateParticipantHours(entry.registerId)

    revalidatePath(`/admin/registers/${entry.registerId}`)
    return { success: true }
  } catch (error) {
    console.error("Error deleting entry:", error)
    return { success: false, error: "Errore durante l'eliminazione" }
  }
}

export async function getEntry(entryId: string) {
  const session = await auth()
  if (session?.user?.role !== "ADMIN" && session?.user?.role !== "TEACHER") return null

  return db.registerEntry.findUnique({
    where: { id: entryId },
    include: {
      register: {
        include: {
          participants: {
            include: {
              user: { select: { id: true, name: true, email: true } },
            },
            orderBy: { user: { name: "asc" } },
          },
          instructors: true,
        },
      },
      attendances: {
        include: {
          participant: {
            include: {
              user: { select: { id: true, name: true, email: true } },
            },
          },
        },
      },
      instructorEntries: {
        include: {
          instructor: true,
        },
      },
    },
  })
}

// ============ PARTICIPANTS ============

export async function addParticipants(
  registerId: string,
  participants: {
    userId: string
    fiscalCode?: string
    companyName?: string
    jobTitle?: string
  }[]
) {
  const session = await auth()
  if (session?.user?.role !== "ADMIN" && session?.user?.role !== "TEACHER") {
    return { success: false, error: "Non autorizzato" }
  }

  try {
    const register = await db.classRegister.findUnique({ where: { id: registerId } })
    if (!register) return { success: false, error: "Registro non trovato" }

    await db.registerParticipant.createMany({
      data: participants.map((p) => ({
        registerId,
        userId: p.userId,
        fiscalCode: p.fiscalCode,
        companyName: p.companyName,
        jobTitle: p.jobTitle,
      })),
      skipDuplicates: true,
    })

    revalidatePath(`/admin/registers/${registerId}`)
    return { success: true }
  } catch (error) {
    console.error("Error adding participants:", error)
    return { success: false, error: "Errore durante l'aggiunta dei partecipanti" }
  }
}

export async function importParticipantsFromCourse(registerId: string) {
  const session = await auth()
  if (session?.user?.role !== "ADMIN" && session?.user?.role !== "TEACHER") {
    return { success: false, error: "Non autorizzato" }
  }

  try {
    const register = await db.classRegister.findUnique({
      where: { id: registerId },
      include: { course: true },
    })
    if (!register) return { success: false, error: "Registro non trovato" }

    const enrollments = await db.enrollment.findMany({
      where: { courseId: register.courseId },
      include: {
        user: {
          select: { id: true, company: { select: { name: true } } },
        },
      },
    })

    await db.registerParticipant.createMany({
      data: enrollments.map((e) => ({
        registerId,
        userId: e.userId,
        companyName: e.user.company?.name,
      })),
      skipDuplicates: true,
    })

    revalidatePath(`/admin/registers/${registerId}`)
    return { success: true, imported: enrollments.length }
  } catch (error) {
    console.error("Error importing participants:", error)
    return { success: false, error: "Errore durante l'import" }
  }
}

export async function removeParticipant(participantId: string) {
  const session = await auth()
  if (session?.user?.role !== "ADMIN" && session?.user?.role !== "TEACHER") {
    return { success: false, error: "Non autorizzato" }
  }

  try {
    const participant = await db.registerParticipant.findUnique({
      where: { id: participantId },
    })
    if (!participant) return { success: false, error: "Partecipante non trovato" }

    await db.registerParticipant.delete({ where: { id: participantId } })

    revalidatePath(`/admin/registers/${participant.registerId}`)
    return { success: true }
  } catch (error) {
    console.error("Error removing participant:", error)
    return { success: false, error: "Errore durante la rimozione" }
  }
}

export async function updateParticipant(
  participantId: string,
  data: { fiscalCode?: string; companyName?: string; jobTitle?: string; notes?: string }
) {
  const session = await auth()
  if (session?.user?.role !== "ADMIN" && session?.user?.role !== "TEACHER") {
    return { success: false, error: "Non autorizzato" }
  }

  try {
    const participant = await db.registerParticipant.findUnique({
      where: { id: participantId },
    })
    if (!participant) return { success: false, error: "Partecipante non trovato" }

    await db.registerParticipant.update({ where: { id: participantId }, data })

    revalidatePath(`/admin/registers/${participant.registerId}`)
    return { success: true }
  } catch (error) {
    console.error("Error updating participant:", error)
    return { success: false, error: "Errore durante l'aggiornamento" }
  }
}

// ============ ENTRY ATTENDANCE ============

export async function saveEntryAttendance(
  entryId: string,
  attendances: {
    participantId: string
    status: AttendanceStatus
    hoursAttended?: number
    notes?: string
  }[]
) {
  const session = await auth()
  if (session?.user?.role !== "ADMIN" && session?.user?.role !== "TEACHER") {
    return { success: false, error: "Non autorizzato" }
  }

  try {
    const entry = await db.registerEntry.findUnique({
      where: { id: entryId },
      include: { register: true },
    })
    if (!entry) return { success: false, error: "Giornata non trovata" }
    if (entry.register.status === "CLOSED" || entry.register.status === "ARCHIVED") {
      return { success: false, error: "Registro non modificabile" }
    }

    for (const att of attendances) {
      await db.entryAttendance.upsert({
        where: {
          entryId_participantId: {
            entryId,
            participantId: att.participantId,
          },
        },
        create: {
          entryId,
          participantId: att.participantId,
          status: att.status,
          hoursAttended: att.hoursAttended,
          notes: att.notes,
        },
        update: {
          status: att.status,
          hoursAttended: att.hoursAttended,
          notes: att.notes,
        },
      })
    }

    // Recalculate participant hours
    await recalculateParticipantHours(entry.registerId)

    revalidatePath(`/admin/registers/${entry.registerId}`)
    revalidatePath(`/admin/registers/${entry.registerId}/entry/${entryId}`)
    return { success: true }
  } catch (error) {
    console.error("Error saving attendance:", error)
    return { success: false, error: "Errore durante il salvataggio presenze" }
  }
}

export async function autoFillFromLiveSession(entryId: string) {
  const session = await auth()
  if (session?.user?.role !== "ADMIN" && session?.user?.role !== "TEACHER") {
    return { success: false, error: "Non autorizzato" }
  }

  try {
    const entry = await db.registerEntry.findUnique({
      where: { id: entryId },
      include: {
        register: {
          include: { participants: true },
        },
      },
    })
    if (!entry || !entry.liveSessionId) {
      return { success: false, error: "Nessuna sessione live collegata" }
    }

    const sessionAttendances = await db.sessionAttendance.findMany({
      where: { sessionId: entry.liveSessionId },
    })

    const participantByUser = new Map(
      entry.register.participants.map((p) => [p.userId, p.id])
    )

    let filled = 0
    for (const sa of sessionAttendances) {
      const participantId = participantByUser.get(sa.userId)
      if (!participantId) continue

      const hours = sa.durationMinutes ? Math.round((sa.durationMinutes / 60) * 100) / 100 : undefined

      await db.entryAttendance.upsert({
        where: {
          entryId_participantId: { entryId, participantId },
        },
        create: {
          entryId,
          participantId,
          status: sa.status,
          hoursAttended: hours,
        },
        update: {
          status: sa.status,
          hoursAttended: hours,
        },
      })
      filled++
    }

    await recalculateParticipantHours(entry.registerId)

    revalidatePath(`/admin/registers/${entry.registerId}`)
    return { success: true, filled }
  } catch (error) {
    console.error("Error auto-filling:", error)
    return { success: false, error: "Errore durante l'auto-compilazione" }
  }
}

// ============ INSTRUCTORS ============

export async function addInstructor(data: {
  registerId: string
  name: string
  email?: string
  role: InstructorRole
  specialization?: string
  userId?: string
}) {
  const session = await auth()
  if (session?.user?.role !== "ADMIN" && session?.user?.role !== "TEACHER") {
    return { success: false, error: "Non autorizzato" }
  }

  try {
    await db.registerInstructor.create({ data })

    revalidatePath(`/admin/registers/${data.registerId}`)
    return { success: true }
  } catch (error) {
    console.error("Error adding instructor:", error)
    return { success: false, error: "Errore durante l'aggiunta del docente" }
  }
}

export async function removeInstructor(instructorId: string) {
  const session = await auth()
  if (session?.user?.role !== "ADMIN" && session?.user?.role !== "TEACHER") {
    return { success: false, error: "Non autorizzato" }
  }

  try {
    const instructor = await db.registerInstructor.findUnique({
      where: { id: instructorId },
    })
    if (!instructor) return { success: false, error: "Docente non trovato" }

    await db.registerInstructor.delete({ where: { id: instructorId } })

    revalidatePath(`/admin/registers/${instructor.registerId}`)
    return { success: true }
  } catch (error) {
    console.error("Error removing instructor:", error)
    return { success: false, error: "Errore durante la rimozione" }
  }
}

export async function saveInstructorEntries(
  entryId: string,
  entries: { instructorId: string; hoursDelivered: number; topics?: string }[]
) {
  const session = await auth()
  if (session?.user?.role !== "ADMIN" && session?.user?.role !== "TEACHER") {
    return { success: false, error: "Non autorizzato" }
  }

  try {
    const entry = await db.registerEntry.findUnique({
      where: { id: entryId },
    })
    if (!entry) return { success: false, error: "Giornata non trovata" }

    for (const ie of entries) {
      await db.instructorEntry.upsert({
        where: {
          entryId_instructorId: {
            entryId,
            instructorId: ie.instructorId,
          },
        },
        create: {
          entryId,
          instructorId: ie.instructorId,
          hoursDelivered: ie.hoursDelivered,
          topics: ie.topics,
        },
        update: {
          hoursDelivered: ie.hoursDelivered,
          topics: ie.topics,
        },
      })
    }

    // Recalculate instructor total hours
    for (const ie of entries) {
      const total = await db.instructorEntry.aggregate({
        where: { instructorId: ie.instructorId },
        _sum: { hoursDelivered: true },
      })
      await db.registerInstructor.update({
        where: { id: ie.instructorId },
        data: { totalHours: total._sum.hoursDelivered ?? 0 },
      })
    }

    revalidatePath(`/admin/registers/${entry.registerId}`)
    return { success: true }
  } catch (error) {
    console.error("Error saving instructor entries:", error)
    return { success: false, error: "Errore durante il salvataggio" }
  }
}

// ============ HELPERS ============

async function recalculateParticipantHours(registerId: string) {
  const participants = await db.registerParticipant.findMany({
    where: { registerId },
  })

  const register = await db.classRegister.findUnique({
    where: { id: registerId },
  })
  if (!register) return

  for (const participant of participants) {
    const attendances = await db.entryAttendance.findMany({
      where: {
        participantId: participant.id,
        status: { in: ["PRESENT", "ATTENDED", "LATE"] },
      },
      include: { entry: true },
    })

    let totalHours = 0
    for (const att of attendances) {
      totalHours += att.hoursAttended ?? att.entry.effectiveHours
    }

    const isCompliant =
      (totalHours + participant.elearningHours) >=
      (register.plannedHours * register.complianceThreshold / 100)

    await db.registerParticipant.update({
      where: { id: participant.id },
      data: {
        totalHours: Math.round(totalHours * 100) / 100,
        isCompliant,
      },
    })
  }
}

// ============ UTILITY QUERIES ============

export async function getCoursesForRegister() {
  const session = await auth()
  if (session?.user?.role !== "ADMIN" && session?.user?.role !== "TEACHER") return []

  return db.course.findMany({
    where: { published: true, archived: false },
    select: { id: true, title: true },
    orderBy: { title: "asc" },
  })
}

export async function getAvailableUsersForRegister(registerId: string) {
  const session = await auth()
  if (session?.user?.role !== "ADMIN" && session?.user?.role !== "TEACHER") return []

  const existingParticipants = await db.registerParticipant.findMany({
    where: { registerId },
    select: { userId: true },
  })

  const existingUserIds = existingParticipants.map((p) => p.userId)

  return db.user.findMany({
    where: {
      id: { notIn: existingUserIds },
      isApproved: true,
    },
    select: { id: true, name: true, email: true, company: { select: { name: true } } },
    orderBy: { name: "asc" },
  })
}

export async function getTeachersForRegister(registerId: string) {
  const session = await auth()
  if (session?.user?.role !== "ADMIN" && session?.user?.role !== "TEACHER") return []

  const existingInstructors = await db.registerInstructor.findMany({
    where: { registerId },
    select: { userId: true },
  })

  const existingUserIds = existingInstructors
    .map((i) => i.userId)
    .filter((id): id is string => id !== null)

  return db.user.findMany({
    where: {
      role: "TEACHER",
      isApproved: true,
      ...(existingUserIds.length > 0 && { id: { notIn: existingUserIds } }),
    },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  })
}

// ============ SYNC ATTENDANCE FROM LIVE SESSIONS ============

export async function syncAttendanceFromLiveSessions(registerId: string) {
  const session = await auth()
  if (session?.user?.role !== "ADMIN" && session?.user?.role !== "TEACHER") {
    return { success: false, error: "Non autorizzato" }
  }

  try {
    const register = await db.classRegister.findUnique({
      where: { id: registerId },
      include: {
        participants: true,
        entries: { select: { liveSessionId: true } },
      },
    })
    if (!register) return { success: false, error: "Registro non trovato" }
    if (register.status === "CLOSED" || register.status === "ARCHIVED") {
      return { success: false, error: "Registro non modificabile" }
    }

    // Find all live sessions for this course that are past OR have attendance data
    const liveSessions = await db.liveSession.findMany({
      where: {
        courseId: register.courseId,
        OR: [
          { endTime: { lte: new Date() } },
          { attendance: { some: { status: { in: ["ATTENDED", "PRESENT", "LATE"] } } } },
        ],
      },
      include: {
        attendance: true,
        instructor: { select: { id: true, name: true, email: true } },
      },
      orderBy: { startTime: "asc" },
    })

    if (liveSessions.length === 0) {
      return { success: false, error: "Nessuna sessione live trovata per questo corso" }
    }

    // Map of existing linked sessions to avoid duplicates
    const linkedSessionIds = new Set(
      register.entries.filter((e) => e.liveSessionId).map((e) => e.liveSessionId)
    )

    // Auto-import participants from live session attendances if not already in register
    const allAttendeeUserIds = new Set<string>()
    for (const ls of liveSessions) {
      for (const sa of ls.attendance) {
        allAttendeeUserIds.add(sa.userId)
      }
    }
    const existingUserIds = new Set(register.participants.map((p) => p.userId))
    const newUserIds = [...allAttendeeUserIds].filter((uid) => !existingUserIds.has(uid))

    if (newUserIds.length > 0) {
      const users = await db.user.findMany({
        where: { id: { in: newUserIds } },
        select: { id: true, company: { select: { name: true } } },
      })
      await db.registerParticipant.createMany({
        data: users.map((u) => ({
          registerId,
          userId: u.id,
          companyName: u.company?.name,
        })),
        skipDuplicates: true,
      })
    }

    // Re-fetch participants after import
    const updatedParticipants = await db.registerParticipant.findMany({
      where: { registerId },
    })
    const participantByUser = new Map(
      updatedParticipants.map((p) => [p.userId, p.id])
    )

    // Auto-import instructors from live sessions
    const existingInstructors = await db.registerInstructor.findMany({
      where: { registerId },
    })
    const instructorByUserId = new Map(
      existingInstructors.filter((i) => i.userId).map((i) => [i.userId!, i.id])
    )

    for (const ls of liveSessions) {
      if (!instructorByUserId.has(ls.instructorId)) {
        const inst = await db.registerInstructor.create({
          data: {
            registerId,
            name: ls.instructor.name || ls.instructor.email,
            email: ls.instructor.email,
            role: "DOCENTE",
            userId: ls.instructorId,
          },
        })
        instructorByUserId.set(ls.instructorId, inst.id)
      }
    }

    const sessionTypeToDelivery = (type: string): DeliveryMode => {
      switch (type) {
        case "IN_PERSON": return "IN_PERSON"
        case "ONLINE": return "ONLINE"
        default: return "ONLINE"
      }
    }

    let participantsImported = newUserIds.length
    let entriesCreated = 0
    let attendancesFilled = 0

    for (const ls of liveSessions) {
      // Skip if already linked
      if (linkedSessionIds.has(ls.id)) {
        // Still sync attendance for existing entries
        const existingEntry = await db.registerEntry.findFirst({
          where: { registerId, liveSessionId: ls.id },
        })
        if (existingEntry && ls.attendance.length > 0) {
          for (const sa of ls.attendance) {
            const participantId = participantByUser.get(sa.userId)
            if (!participantId) continue
            const hours = sa.durationMinutes ? Math.round((sa.durationMinutes / 60) * 100) / 100 : undefined
            await db.entryAttendance.upsert({
              where: {
                entryId_participantId: { entryId: existingEntry.id, participantId },
              },
              create: {
                entryId: existingEntry.id,
                participantId,
                status: sa.status,
                hoursAttended: hours,
              },
              update: {
                status: sa.status,
                hoursAttended: hours,
              },
            })
            attendancesFilled++
          }
        }
        continue
      }

      // Create new entry from live session
      // Calculate effective hours from session times, or fallback to attendance data
      let effectiveHours = 0
      let entryDate = ls.startTime || new Date()
      let entryStartTime = ls.startTime
      let entryEndTime = ls.endTime

      if (ls.startTime && ls.endTime) {
        const diffMs = ls.endTime.getTime() - ls.startTime.getTime()
        effectiveHours = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100
      } else if (ls.attendance.length > 0) {
        // Derive times from attendance check-in/check-out
        const checkIns = ls.attendance.filter(a => a.checkInTime).map(a => a.checkInTime!.getTime())
        const checkOuts = ls.attendance.filter(a => a.checkOutTime).map(a => a.checkOutTime!.getTime())
        if (checkIns.length > 0) {
          entryDate = new Date(Math.min(...checkIns))
          entryStartTime = entryStartTime || new Date(Math.min(...checkIns))
        }
        if (checkOuts.length > 0) {
          entryEndTime = entryEndTime || new Date(Math.max(...checkOuts))
        }
        // Use max duration from attendance
        const maxDuration = Math.max(...ls.attendance.map(a => a.durationMinutes || 0))
        if (maxDuration > 0) {
          effectiveHours = Math.round((maxDuration / 60) * 100) / 100
        } else if (entryStartTime && entryEndTime) {
          const diffMs = entryEndTime.getTime() - entryStartTime.getTime()
          effectiveHours = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100
        }
      }

      const entry = await db.registerEntry.create({
        data: {
          registerId,
          date: entryDate,
          startTime: entryStartTime,
          endTime: entryEndTime,
          pauseMinutes: 0,
          effectiveHours,
          topics: ls.title + (ls.description ? ` - ${ls.description}` : ""),
          deliveryMode: sessionTypeToDelivery(ls.sessionType),
          liveSessionId: ls.id,
        },
      })
      entriesCreated++

      // Fill attendance from session attendance records
      for (const sa of ls.attendance) {
        const participantId = participantByUser.get(sa.userId)
        if (!participantId) continue
        const hours = sa.durationMinutes ? Math.round((sa.durationMinutes / 60) * 100) / 100 : undefined
        await db.entryAttendance.create({
          data: {
            entryId: entry.id,
            participantId,
            status: sa.status,
            hoursAttended: hours,
          },
        })
        attendancesFilled++
      }

      // Create instructor entry for the live session instructor
      const regInstructorId = instructorByUserId.get(ls.instructorId)
      if (regInstructorId) {
        await db.instructorEntry.upsert({
          where: {
            entryId_instructorId: { entryId: entry.id, instructorId: regInstructorId },
          },
          create: {
            entryId: entry.id,
            instructorId: regInstructorId,
            hoursDelivered: effectiveHours,
            topics: ls.title,
          },
          update: {
            hoursDelivered: effectiveHours,
            topics: ls.title,
          },
        })
      }
    }

    // Recalculate hours
    await recalculateParticipantHours(registerId)

    // Recalculate instructor total hours
    const allInstructors = await db.registerInstructor.findMany({ where: { registerId } })
    for (const inst of allInstructors) {
      const total = await db.instructorEntry.aggregate({
        where: { instructorId: inst.id },
        _sum: { hoursDelivered: true },
      })
      await db.registerInstructor.update({
        where: { id: inst.id },
        data: { totalHours: total._sum.hoursDelivered ?? 0 },
      })
    }

    revalidatePath(`/admin/registers/${registerId}`)
    return {
      success: true,
      participantsImported,
      entriesCreated,
      attendancesFilled,
      totalSessions: liveSessions.length,
    }
  } catch (error) {
    console.error("Error syncing from live sessions:", error)
    return { success: false, error: "Errore durante la sincronizzazione" }
  }
}

export async function getLiveSessionsForRegister(registerId: string) {
  const session = await auth()
  if (session?.user?.role !== "ADMIN" && session?.user?.role !== "TEACHER") return []

  const register = await db.classRegister.findUnique({
    where: { id: registerId },
    select: { courseId: true },
  })
  if (!register) return []

  // Get existing linked sessions to mark them
  const linkedEntries = await db.registerEntry.findMany({
    where: { registerId, liveSessionId: { not: null } },
    select: { liveSessionId: true },
  })
  const linkedIds = new Set(linkedEntries.map((e) => e.liveSessionId))

  const sessions = await db.liveSession.findMany({
    where: { courseId: register.courseId },
    select: {
      id: true,
      title: true,
      startTime: true,
      endTime: true,
      sessionType: true,
      _count: { select: { attendance: true } },
    },
    orderBy: { startTime: "asc" },
  })

  return sessions.map((s) => ({
    ...s,
    alreadyLinked: linkedIds.has(s.id),
  }))
}

// ============ E-LEARNING SYNC ============

export async function syncElearningHours(registerId: string) {
  const session = await auth()
  if (session?.user?.role !== "ADMIN" && session?.user?.role !== "TEACHER") {
    return { success: false, error: "Non autorizzato" }
  }

  try {
    const register = await db.classRegister.findUnique({
      where: { id: registerId },
      include: {
        participants: true,
      },
    })
    if (!register) return { success: false, error: "Registro non trovato" }

    let synced = 0

    for (const participant of register.participants) {
      // Get total e-learning time from ModuleProgress for courses modules
      const moduleProgressList = await db.moduleProgress.findMany({
        where: {
          userId: participant.userId,
          module: {
            courseId: register.courseId,
          },
        },
        select: { timeSpent: true },
      })

      // timeSpent is in seconds, convert to hours
      const totalSeconds = moduleProgressList.reduce((sum, mp) => sum + mp.timeSpent, 0)
      const elearningHours = Math.round((totalSeconds / 3600) * 100) / 100

      if (elearningHours !== participant.elearningHours) {
        const isCompliant =
          (participant.totalHours + elearningHours) >=
          (register.plannedHours * register.complianceThreshold / 100)

        await db.registerParticipant.update({
          where: { id: participant.id },
          data: {
            elearningHours,
            isCompliant,
          },
        })
        synced++
      }
    }

    revalidatePath(`/admin/registers/${registerId}`)
    return { success: true, synced }
  } catch (error) {
    console.error("Error syncing e-learning hours:", error)
    return { success: false, error: "Errore durante la sincronizzazione" }
  }
}

// ============ EXPORT CSV ============

export async function exportRegisterCSV(registerId: string) {
  const session = await auth()
  if (session?.user?.role !== "ADMIN" && session?.user?.role !== "TEACHER") {
    return { success: false, error: "Non autorizzato" }
  }

  try {
    const register = await db.classRegister.findUnique({
      where: { id: registerId },
      include: {
        course: { select: { title: true } },
        participants: {
          include: {
            user: { select: { name: true, email: true } },
          },
          orderBy: { user: { name: "asc" } },
        },
      },
    })
    if (!register) return { success: false, error: "Registro non trovato" }

    const headers = [
      "N.",
      "Nome",
      "Email",
      ...(register.registerType === "FUNDED" ? ["Codice Fiscale"] : []),
      "Azienda",
      "Qualifica",
      "Ore Aula",
      "Ore E-Learning",
      "Ore Totali",
      "% Completamento",
      "Conforme",
    ]

    const rows = register.participants.map((p, i) => {
      const total = p.totalHours + p.elearningHours
      const pct = register.plannedHours > 0
        ? Math.round((total / register.plannedHours) * 100)
        : 0
      return [
        (i + 1).toString(),
        p.user.name || "",
        p.user.email,
        ...(register.registerType === "FUNDED" ? [p.fiscalCode || ""] : []),
        p.companyName || "",
        p.jobTitle || "",
        p.totalHours.toString(),
        p.elearningHours.toString(),
        total.toString(),
        `${pct}%`,
        p.isCompliant ? "Si" : "No",
      ]
    })

    const csv = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n")

    return {
      success: true,
      csv,
      filename: `registro-${register.course.title.replace(/\s+/g, "-").toLowerCase()}.csv`,
    }
  } catch (error) {
    console.error("Error exporting CSV:", error)
    return { success: false, error: "Errore durante l'export" }
  }
}
