import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreateSessionForm } from "./create-session-form";

export default async function CreateLiveSessionPage() {
    const session = await auth();
    if (session?.user?.role !== "ADMIN" && session?.user?.role !== "TEACHER") redirect("/");

    const instructors = await db.user.findMany({
        where: { role: { in: ["ADMIN", "TEACHER"] } },
        select: { id: true, name: true, email: true },
        orderBy: { name: "asc" },
    });

    const courses = await db.course.findMany({
        where: { published: true },
        select: {
            id: true,
            title: true,
            editions: {
                select: { id: true, code: true, title: true, status: true },
                orderBy: { createdAt: "desc" },
            },
        },
        orderBy: { title: "asc" },
    });

    return (
        <div className="min-h-screen p-8 bg-background text-foreground">
            <div className="max-w-2xl mx-auto">
                <Card className="bg-card border-border">
                    <CardHeader>
                        <CardTitle className="text-2xl text-foreground">Nuova Sessione Live</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <CreateSessionForm
                            courses={courses}
                            instructors={instructors}
                            currentUserId={session.user.id!}
                        />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
