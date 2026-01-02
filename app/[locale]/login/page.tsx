"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { signIn } from "next-auth/react"
import { useRouter, usePathname } from "@/i18n/navigation"
import { useSearchParams } from "next/navigation"
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
import { registerUser } from "@/app/actions/register"
import { useToast } from "@/components/ui/use-toast"
import { motion, AnimatePresence } from "framer-motion"
import { useTranslations } from "next-intl"
import { LanguageSwitcher } from "@/components/language-switcher"

export default function AuthPage() {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const { toast } = useToast()
    const t = useTranslations("Auth")
    const [activeTab, setActiveTab] = useState<"login" | "register">(
        searchParams.get("tab") === "register" ? "register" : "login"
    )
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Schemas with translations
    const loginSchema = z.object({
        email: z.string().email({ message: t("emailLabel") + " non valida" }), // Simplified for now
        password: z.string().min(1, { message: t("passwordLabel") + " richiesta" }),
    })

    const registerSchema = z.object({
        name: z.string().min(2, t("nameLabel") + " min 2 chars"),
        email: z.string().email(t("emailLabel") + " invalid"),
        password: z.string().min(6, t("passwordLabel") + " min 6 chars"),
        confirmPassword: z.string()
    }).refine((data) => data.password === data.confirmPassword, {
        message: "Passwords do not match",
        path: ["confirmPassword"],
    })

    // Icons
    const Mail = ({ className }: { className?: string }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>;
    const Lock = ({ className }: { className?: string }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>;
    const User = ({ className }: { className?: string }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>;

    // Login Form
    const loginForm = useForm<z.infer<typeof loginSchema>>({
        resolver: zodResolver(loginSchema),
        defaultValues: { email: "", password: "" },
    })

    // Register Form
    const registerForm = useForm<z.infer<typeof registerSchema>>({
        resolver: zodResolver(registerSchema),
        defaultValues: { name: "", email: "", password: "", confirmPassword: "" },
    })

    async function onLogin(values: z.infer<typeof loginSchema>) {
        setIsLoading(true)
        setError(null)
        try {
            const result = await signIn("credentials", {
                email: values.email,
                password: values.password,
                redirect: false,
            })

            if (result?.error) {
                setError("Credenziali non valide.")
            } else {
                router.push("/")
                router.refresh()
            }
        } catch (error) {
            setError("Si è verificato un errore.")
        } finally {
            setIsLoading(false)
        }
    }

    async function onRegister(values: z.infer<typeof registerSchema>) {
        setIsLoading(true)
        try {
            const result = await registerUser(values)
            if (result.success) {
                toast({
                    title: "Registrazione avvenuta con successo!",
                    description: "Attendi l'approvazione dell'amministratore.",
                })
                setActiveTab("login")
            } else {
                toast({
                    variant: "destructive",
                    title: "Errore",
                    description: result.error || "Errore durante la registrazione",
                })
            }
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Errore",
                description: "Si è verificato un errore imprevisto",
            })
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-background transition-colors duration-300">
            <div className="absolute top-4 right-4">
                <LanguageSwitcher />
            </div>
            <div className="w-full max-w-md">
                <div className="bg-card/50 backdrop-blur-xl rounded-3xl p-8 border border-border shadow-2xl overflow-hidden relative">

                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary/20">
                            <span className="text-3xl font-bold text-primary-foreground">L</span>
                        </div>
                        <h1 className="text-3xl font-bold text-foreground mb-2">{activeTab === "login" ? t("loginTitle") : t("registerTitle")}</h1>
                        <p className="text-muted-foreground">
                            {activeTab === "login" ? t("loginSubtitle") : t("registerSubtitle")}
                        </p>
                    </div>

                    {/* Tabs */}
                    <div className="grid grid-cols-2 gap-2 p-1 bg-muted/50 rounded-xl mb-8">
                        <button
                            onClick={() => setActiveTab("login")}
                            className={`py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${activeTab === "login"
                                ? "bg-background text-foreground shadow-sm"
                                : "text-muted-foreground hover:text-foreground"
                                }`}
                        >
                            {t("loginButton")}
                        </button>
                        <button
                            onClick={() => setActiveTab("register")}
                            className={`py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${activeTab === "register"
                                ? "bg-background text-foreground shadow-sm"
                                : "text-muted-foreground hover:text-foreground"
                                }`}
                        >
                            {t("registerButton")}
                        </button>
                    </div>

                    {/* Forms */}
                    <AnimatePresence mode="wait">
                        {activeTab === "login" ? (
                            <motion.div
                                key="login"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                transition={{ duration: 0.2 }}
                            >
                                <Form {...loginForm}>
                                    <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-6">
                                        <FormField
                                            control={loginForm.control}
                                            name="email"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>{t("emailLabel")}</FormLabel>
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
                                                    <FormLabel>{t("passwordLabel")}</FormLabel>
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
                                            <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                                                {error}
                                            </div>
                                        )}

                                        <Button type="submit" disabled={isLoading} className="w-full h-12 text-lg">
                                            {isLoading ? "Accesso..." : t("loginButton")}
                                        </Button>
                                    </form>
                                </Form>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="register"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.2 }}
                            >
                                <Form {...registerForm}>
                                    <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-4">
                                        <FormField
                                            control={registerForm.control}
                                            name="name"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>{t("nameLabel")}</FormLabel>
                                                    <div className="relative group">
                                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                            <User className="h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                                        </div>
                                                        <FormControl>
                                                            <Input placeholder="Mario Rossi" className="pl-11 h-12 bg-background/50" {...field} />
                                                        </FormControl>
                                                    </div>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={registerForm.control}
                                            name="email"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>{t("emailLabel")}</FormLabel>
                                                    <div className="relative group">
                                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                            <Mail className="h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                                        </div>
                                                        <FormControl>
                                                            <Input placeholder="mario.rossi@example.com" className="pl-11 h-12 bg-background/50" {...field} />
                                                        </FormControl>
                                                    </div>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={registerForm.control}
                                            name="password"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>{t("passwordLabel")}</FormLabel>
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
                                        <FormField
                                            control={registerForm.control}
                                            name="confirmPassword"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Conferma Password</FormLabel>
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

                                        <Button type="submit" disabled={isLoading} className="w-full h-12 text-lg mt-2">
                                            {isLoading ? "Registrazione..." : t("registerButton")}
                                        </Button>
                                    </form>
                                </Form>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    )
}
