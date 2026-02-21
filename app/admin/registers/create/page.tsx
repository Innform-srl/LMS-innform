import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getCoursesForRegister } from "@/app/actions/registers"
import { CreateRegisterForm } from "./create-register-form"

export default async function CreateRegisterPage() {
    const session = await auth()
    if (session?.user?.role !== "ADMIN" && session?.user?.role !== "TEACHER") redirect("/")

    const courses = await getCoursesForRegister()

    return (
        <div className="min-h-screen p-8 bg-background text-foreground">
            <div className="max-w-3xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-foreground">Nuovo Registro d&apos;Aula</h1>
                    <p className="text-muted-foreground">Crea un registro presenze per un corso</p>
                </div>

                <CreateRegisterForm courses={courses} />
            </div>
        </div>
    )
}
