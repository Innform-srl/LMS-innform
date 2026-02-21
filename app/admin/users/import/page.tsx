import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Upload } from "lucide-react"
import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import bcrypt from "bcryptjs"
import { sendWelcomeEmail } from "@/lib/email"

export default async function ImportUsersPage() {
    const session = await auth()
    if (session?.user?.role !== "ADMIN") redirect("/")

    async function importUsers(formData: FormData) {
        'use server'
        const file = formData.get("file") as File
        if (!file) return

        const text = await file.text()
        const lines = text.split('\n').slice(1) // Skip header

        const hashedPassword = await bcrypt.hash("password", 10) // Default password

        let _successCount = 0
        let _errorCount = 0

        for (const line of lines) {
            if (!line.trim()) continue
            const [name, email, departmentName] = line.split(',').map(s => s.trim())

            if (!email) continue

            try {
                // Find or create department if specified
                let departmentId = null
                if (departmentName) {
                    const dept = await db.department.upsert({
                        where: { name: departmentName },
                        update: {},
                        create: { name: departmentName }
                    })
                    departmentId = dept.id
                }

                await db.user.create({
                    data: {
                        name,
                        email,
                        password: hashedPassword,
                        role: "EMPLOYEE",
                        departmentId
                    }
                })

                await sendWelcomeEmail(email, name)
                _successCount++
            } catch (e) {
                console.error(`Failed to import user ${email}:`, e)
                _errorCount++
            }
        }

        revalidatePath("/admin/users")
        redirect("/admin/users?imported=true")
    }

    return (
        <div className="p-6 max-w-2xl mx-auto space-y-8">
            <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                    Importa Utenti
                </h1>
                <p className="text-gray-400 mt-2">Carica un file CSV per creare utenti in massa.</p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-8 backdrop-blur-sm">
                <form action={importUsers} className="space-y-6">
                    <div className="space-y-4">
                        <Label>File CSV</Label>
                        <div className="border-2 border-dashed border-white/10 rounded-lg p-8 text-center hover:bg-white/5 transition-colors">
                            <Input
                                type="file"
                                name="file"
                                accept=".csv"
                                required
                                className="hidden"
                                id="csv-upload"
                            />
                            <Label htmlFor="csv-upload" className="cursor-pointer flex flex-col items-center gap-2">
                                <Upload className="w-8 h-8 text-blue-400" />
                                <span className="text-lg font-medium">Clicca per caricare</span>
                                <span className="text-sm text-gray-500">Formato: Nome, Email, Dipartimento</span>
                            </Label>
                        </div>
                    </div>

                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 text-sm text-blue-200">
                        <p className="font-semibold mb-1">Formato CSV Richiesto:</p>
                        <code className="block bg-black/20 p-2 rounded mt-2">
                            Name,Email,Department<br />
                            Mario Rossi,mario@example.com,Sales<br />
                            Luigi Verdi,luigi@example.com,IT
                        </code>
                        <p className="mt-2 text-xs opacity-70">La password di default sarà &quot;password&quot;.</p>
                    </div>

                    <Button type="submit" className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                        Avvia Importazione
                    </Button>
                </form>
            </div>
        </div>
    )
}
