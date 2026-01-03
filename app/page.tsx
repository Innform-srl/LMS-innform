import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { db } from "@/lib/db"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DeadlineBadge } from "@/components/deadline-badge"
import { getTimeElapsed } from "@/lib/time-utils"
import { getUpcomingSessions } from "@/app/actions/live-sessions"
import { JoinSessionButton } from "@/components/join-session-button"

export default async function Home() {
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  const enrollments = await db.enrollment.findMany({
    where: { userId: session.user.id },
    select: {
      id: true,
      progress: true,
      completed: true,
      completedAt: true,
      dueDate: true,
      timeSpent: true,
      createdAt: true,
      course: {
        select: {
          id: true,
          title: true,
          description: true,
          imageUrl: true,
          isRequired: true,
          minimumDuration: true,
          modules: {
            where: { published: true },
            select: {
              id: true,
              videoDuration: true
            }
          }
        }
      },
      certificate: {
        select: {
          id: true
        }
      }
    },
    orderBy: { createdAt: "desc" }
  })

  const upcomingSessions = await getUpcomingSessions()

  // Get enrollments with upcoming deadlines
  const upcomingDeadlines = enrollments.filter(e => {
    if (!e.dueDate || e.completed) return false
    const daysUntil = Math.ceil((new Date(e.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    return daysUntil >= 0 && daysUntil <= 7
  }).sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())

  const inProgressCourses = enrollments.filter(e => !e.completed)
  const completedCourses = enrollments.filter(e => e.completed)

  // Calculate total study time (timeSpent is in seconds)
  const totalSeconds = enrollments.reduce((acc, curr) => acc + (curr.timeSpent || 0), 0)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-12">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-4xl font-bold ">
                <span className="text-primary">Bentornato, {session.user.name || session.user.email?.split('@')[0] || "Utente"}!</span>
              </h1>
              <p className="text-muted-foreground">Il tuo percorso di apprendimento</p>
            </div>

            <div className="flex gap-3 items-center">
              {/* Controls moved to global header */}
            </div>
          </div>

          {/* Upcoming Live Sessions */}
          {upcomingSessions.length > 0 && (
            <Card className="glass border-border mb-8 bg-gradient-to-r from-indigo-500/10 to-purple-500/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
                  </span>
                  Prossime Live Session
                </CardTitle>
                <CardDescription>Non perdere le prossime lezioni in diretta</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {upcomingSessions.map(liveSession => (
                    <Card key={liveSession.id} className="bg-background/50 border-border">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-semibold line-clamp-1">{liveSession.title}</h4>
                          <span className="text-xs font-mono bg-primary/10 text-primary px-2 py-1 rounded">
                            {new Date(liveSession.startTime).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })}
                            {' '}
                            {new Date(liveSession.startTime).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        {liveSession.course && (
                          <p className="text-xs text-muted-foreground mb-3">
                            {liveSession.course.title}
                          </p>
                        )}
                        <JoinSessionButton
                          meetingUrl={liveSession.meetingUrl}
                          moduleId={liveSession.module?.id}
                          liveSessionId={liveSession.id}
                        />
                      </CardContent>
                    </Card>
                  ))}
                </div>
                <div className="mt-4 text-center">
                  <Link href="/live-sessions" className="text-sm text-muted-foreground hover:text-primary underline">
                    Vedi tutte le sessioni
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {session.user.role === "ADMIN" && (
              <Card className="glass border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span className="w-1 h-6 bg-primary rounded-full" />
                    Azioni Admin
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Link href="/admin/courses">
                    <Button className="w-full justify-start bg-primary text-primary-foreground hover:bg-primary/90">
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Gestisci Corsi e Moduli
                    </Button>
                  </Link>
                  <Link href="/admin/analytics">
                    <Button variant="outline" className="w-full justify-start border-white/10 hover:bg-white/5">
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      Analytics
                    </Button>
                  </Link>
                  <Link href="/admin/users">
                    <Button variant="outline" className="w-full justify-start border-border hover:bg-accent hover:text-accent-foreground">
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                      Gestisci Utenti
                    </Button>
                  </Link>
                  <Link href="/admin/learning-paths">
                    <Button variant="outline" className="w-full justify-start border-white/10 hover:bg-white/5">
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      Percorsi Formativi
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )}

            {/* Quick Links */}
            <Card className="glass border-border card-hover">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="w-1 h-6 bg-primary rounded-full" />
                  Azioni Rapide
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link href="/courses">
                  <Button className="w-full justify-start bg-primary text-primary-foreground hover:bg-primary/90">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    Esplora tutti i corsi
                  </Button>
                </Link>
                <Link href="/settings">
                  <Button variant="outline" className="w-full justify-start border-border hover:bg-accent hover:text-accent-foreground">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Impostazioni Account
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="glass border-border card-hover">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardDescription className="text-muted-foreground">Tempo di Studio</CardDescription>
                    <CardTitle className="text-2xl font-bold text-foreground">
                      {hours}h {minutes}m
                    </CardTitle>
                  </div>
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </CardHeader>
            </Card>

            <Card className="glass border-border card-hover">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardDescription className="text-muted-foreground">Corsi Iscritti</CardDescription>
                    <CardTitle className="text-4xl font-bold text-primary">{enrollments.length}</CardTitle>
                  </div>
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                </div>
              </CardHeader>
            </Card>

            <Card className="glass border-border card-hover">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardDescription className="text-muted-foreground">In Corso</CardDescription>
                    <CardTitle className="text-4xl font-bold text-foreground">{inProgressCourses.length}</CardTitle>
                  </div>
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                </div>
              </CardHeader>
            </Card>

            <Card className="glass border-border card-hover">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardDescription className="text-muted-foreground">Completati</CardDescription>
                    <CardTitle className="text-4xl font-bold text-foreground">{completedCourses.length}</CardTitle>
                  </div>
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </div>
        </div>

        {/* Upcoming Deadlines Alert */}
        {upcomingDeadlines.length > 0 && (
          <Card className="glass border-border mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Corsi in Scadenza
              </CardTitle>
              <CardDescription>Completa questi corsi entro la scadenza</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {upcomingDeadlines.map(enrollment => (
                  <Link
                    key={enrollment.id}
                    href={`/courses/${enrollment.course.id}`}
                    className="flex items-center justify-between p-4 glass border-border rounded-lg hover:bg-accent/50 transition-all"
                  >
                    <div className="flex-1">
                      <h4 className="font-semibold">{enrollment.course.title}</h4>
                      <div className="flex flex-col gap-2 mt-2 w-full">
                        <div className="flex justify-between items-center text-xs text-muted-foreground">
                          <span>Progresso Moduli: {Math.round(enrollment.progress)}%</span>
                          {enrollment.course.minimumDuration > 0 && (
                            <span className={enrollment.timeSpent >= enrollment.course.minimumDuration * 60 ? "text-primary" : "text-muted-foreground"}>
                              {Math.floor(enrollment.timeSpent / 60)}m / {enrollment.course.minimumDuration}m
                            </span>
                          )}
                        </div>
                        <div className="w-full bg-muted rounded-full h-1.5">
                          <div
                            className="bg-primary h-1.5 rounded-full transition-all duration-500"
                            style={{ width: `${enrollment.progress}%` }}
                          />
                        </div>

                        {enrollment.course.minimumDuration > 0 && (
                          <div className="w-full bg-muted rounded-full h-1 mt-1">
                            <div
                              className={`h-1 rounded-full transition-all duration-500 ${enrollment.timeSpent >= enrollment.course.minimumDuration * 60
                                ? 'bg-primary'
                                : 'bg-muted-foreground'
                                }`}
                              style={{ width: `${Math.min((enrollment.timeSpent / (enrollment.course.minimumDuration * 60)) * 100, 100)}%` }}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                    <DeadlineBadge dueDate={enrollment.dueDate!} />
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* In Progress Courses */}
        {inProgressCourses.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <span className="w-1 h-8 bg-blue-500 rounded-full" />
              In Corso
              <span className="ml-2 px-3 py-1 bg-blue-500/10 text-blue-500 text-sm font-semibold rounded-full border border-blue-500/30">
                {inProgressCourses.length} {inProgressCourses.length === 1 ? 'corso' : 'corsi'}
              </span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {inProgressCourses.map((enrollment) => (
                <Card key={enrollment.id} className="glass border-blue-500/30 border-2 card-hover group relative overflow-hidden">
                  {/* Active indicator */}
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-500"></div>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="px-2 py-1 bg-blue-500/10 text-blue-500 text-xs font-semibold rounded border border-blue-500/30 flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            IN CORSO
                          </span>
                        </div>
                        <CardTitle className="text-xl transition-all">{enrollment.course.title}</CardTitle>
                        <CardDescription className="text-muted-foreground">{enrollment.course.description}</CardDescription>
                      </div>
                      {enrollment.dueDate && !enrollment.completed && (
                        <DeadlineBadge dueDate={enrollment.dueDate} size="sm" />
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-muted-foreground">Progresso Moduli</span>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-muted-foreground">
                              {getTimeElapsed(enrollment.createdAt)}
                            </span>
                            <span className="font-semibold text-primary">{Math.round(enrollment.progress)}%</span>
                          </div>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-primary h-2 rounded-full transition-all duration-500"
                            style={{ width: `${enrollment.progress}%` }}
                          />
                        </div>

                        {/* Course Duration Stats */}
                        {(() => {
                          const totalDuration = enrollment.course.modules.reduce((acc, m) => acc + (m.videoDuration || 0), 0)
                          const remainingDuration = Math.round(totalDuration * (100 - enrollment.progress) / 100)

                          if (totalDuration > 0) {
                            const durationHours = Math.floor(totalDuration / 3600)
                            const durationMinutes = Math.floor((totalDuration % 3600) / 60)
                            const remHours = Math.floor(remainingDuration / 3600)
                            const remMinutes = Math.floor((remainingDuration % 3600) / 60)

                            return (
                              <div className="flex justify-between text-xs text-muted-foreground mt-2 pt-2 border-t border-border/50">
                                <span>
                                  Durata: {durationHours > 0 ? `${durationHours}h ` : ''}{durationMinutes}m
                                </span>
                                {enrollment.progress < 100 && remainingDuration > 0 && (
                                  <span className="text-muted-foreground">
                                    Restano: {remHours > 0 ? `${remHours}h ` : ''}{remMinutes}m
                                  </span>
                                )}
                              </div>
                            )
                          }
                          return null
                        })()}

                        {/* Time Tracking Indicator */}
                        {enrollment.course.minimumDuration > 0 && (
                          <div className="mt-2 pt-2 border-t border-border/50">
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-muted-foreground">Tempo di Studio</span>
                              <span className={
                                enrollment.timeSpent >= enrollment.course.minimumDuration
                                  ? 'text-primary font-semibold'
                                  : 'text-muted-foreground'
                              }>
                                {Math.floor(enrollment.timeSpent / 3600)}h {Math.floor((enrollment.timeSpent % 3600) / 60)}m / {Math.floor(enrollment.course.minimumDuration / 60)}h
                              </span>
                            </div>
                            <div className="w-full bg-muted rounded-full h-1 overflow-hidden">
                              <div
                                className={`h-full transition-all duration-500 ${enrollment.timeSpent >= enrollment.course.minimumDuration
                                  ? 'bg-primary'
                                  : enrollment.timeSpent >= enrollment.course.minimumDuration * 0.5
                                    ? 'bg-secondary'
                                    : 'bg-muted'
                                  }`}
                                style={{ width: `${Math.min((enrollment.timeSpent / enrollment.course.minimumDuration) * 100, 100)}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                      <Link href={`/courses/${enrollment.course.id}`}>
                        <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                          Continua Corso
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Completed Courses */}
        {completedCourses.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <span className="w-1 h-8 bg-green-500 rounded-full" />
              Corsi Completati
              <span className="ml-2 px-3 py-1 bg-green-500/10 text-green-500 text-sm font-semibold rounded-full border border-green-500/30">
                {completedCourses.length} {completedCourses.length === 1 ? 'completato' : 'completati'}
              </span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {completedCourses.map((enrollment) => (
                <Card key={enrollment.id} className="glass border-green-500/30 border-2 card-hover relative overflow-hidden">
                  {/* Completion indicator */}
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-500 to-emerald-500"></div>
                  <CardHeader>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-1 bg-green-500/10 text-green-500 text-xs font-semibold rounded border border-green-500/30 flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        COMPLETATO
                      </span>
                      {enrollment.certificate && (
                        <span className="px-2 py-1 bg-amber-500/10 text-amber-500 text-xs font-semibold rounded border border-amber-500/30 flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                          </svg>
                          CERTIFICATO
                        </span>
                      )}
                    </div>
                    <CardTitle className="text-xl">{enrollment.course.title}</CardTitle>
                    <CardDescription className="text-muted-foreground">{enrollment.course.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Link href={`/courses/${enrollment.course.id}`}>
                      <Button variant="outline" className="w-full border-border hover:bg-accent hover:text-accent-foreground mb-2">
                        Rivedi Corso
                      </Button>
                    </Link>
                    {enrollment.certificate && (
                      <Link href={`/api/certificates/${enrollment.certificate.id}/download`} target="_blank">
                        <Button className="w-full bg-green-600 text-white hover:bg-green-700">
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          Scarica Certificato
                        </Button>
                      </Link>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {enrollments.length === 0 && (
          <div className="text-center py-20">
            <div className="w-24 h-24 bg-secondary/20 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <svg className="w-12 h-12 text-secondary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold mb-2">Inizia il tuo percorso</h3>
            <p className="text-muted-foreground mb-6">Non sei ancora iscritto a nessun corso</p>
            <Link href="/courses">
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                Esplora Catalogo
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
