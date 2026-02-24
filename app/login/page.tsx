"use client"

import { useState, Suspense } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"

function AuthPageContent() {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Schema
    const loginSchema = z.object({
        email: z.string().email({ message: "Email non valida" }),
        password: z.string().min(1, { message: "Password richiesta" }),
    })

    // Icons
    const Mail = ({ className }: { className?: string }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>;
    const Lock = ({ className }: { className?: string }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>;

    // Login Form
    const loginForm = useForm<z.infer<typeof loginSchema>>({
        resolver: zodResolver(loginSchema),
        defaultValues: { email: "", password: "" },
    })

    async function onLogin(values: z.infer<typeof loginSchema>) {
        setIsLoading(true)
        setError(null)
        try {
            const response = await fetch("/lms/api/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: values.email, password: values.password }),
            })

            const result = await response.json()

            if (!response.ok) {
                setError(result.error || "Credenziali non valide.")
            } else {
                router.push("/")
                router.refresh()
            }
        } catch (_error) {
            setError("Si è verificato un errore.")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-background transition-colors duration-300">
            <div className="w-full max-w-md">
                <div className="bg-card/50 backdrop-blur-xl rounded-3xl p-8 border border-border shadow-2xl overflow-hidden relative">

                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary/20">
                            <span className="text-3xl font-bold text-primary-foreground">L</span>
                        </div>
                        <h1 className="text-3xl font-bold text-foreground mb-2">Bentornato</h1>
                        <p className="text-muted-foreground">
                            Accedi al tuo account per continuare
                        </p>
                    </div>

                    {/* Login Form */}
                    <Form {...loginForm}>
                        <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-6">
                            <FormField
                                control={loginForm.control}
                                name="email"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Email</FormLabel>
                                        <div className="relative group">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                <Mail className="h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                            </div>
                                            <FormControl>
                                                <Input placeholder="nome@azienda.com" className="pl-11 h-12 bg-background/50" {...field} />
                                            </FormControl>
                                        </div>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={loginForm.control}
                                name="password"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Password</FormLabel>
                                        <div className="relative group">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                <Lock className="h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                            </div>
                                            <FormControl>
                                                <Input type="password" placeholder="••••••••" className="pl-11 h-12 bg-background/50" {...field} />
                                            </FormControl>
                                        </div>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="flex items-center justify-between text-sm">
                                <label className="flex items-center gap-2 cursor-pointer group">
                                    <input type="checkbox" className="rounded border-border text-primary focus:ring-primary bg-background/50" />
                                    <span className="text-muted-foreground group-hover:text-foreground transition-colors">Ricordami</span>
                                </label>
                                <a href="#" className="text-primary hover:text-primary/80 font-medium transition-colors">
                                    Password dimenticata?
                                </a>
                            </div>

                            {error && (
                                <div className="text-destructive text-sm bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                                    {error}
                                </div>
                            )}

                            <Button type="submit" disabled={isLoading} className="w-full h-12 text-lg">
                                {isLoading ? "Accesso..." : "Accedi"}
                            </Button>
                        </form>
                    </Form>
                </div>
            </div>
        </div>
    )
}

// Wrap with Suspense to handle useSearchParams hydration
export default function AuthPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center p-6 bg-background">
                <div className="w-full max-w-md">
                    <div className="bg-card/50 backdrop-blur-xl rounded-3xl p-8 border border-border shadow-2xl">
                        <div className="animate-pulse space-y-4">
                            <div className="h-16 w-16 bg-muted rounded-2xl mx-auto"></div>
                            <div className="h-8 bg-muted rounded w-3/4 mx-auto"></div>
                            <div className="h-4 bg-muted rounded w-1/2 mx-auto"></div>
                        </div>
                    </div>
                </div>
            </div>
        }>
            <AuthPageContent />
        </Suspense>
    )
}
