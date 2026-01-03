import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getCompanies } from "@/app/actions/companies"
import { CreateCompanyForm } from "./create-company-form"
import { CompanyList } from "./company-list"
import Link from "next/link"

export default async function CompaniesPage() {
    const session = await auth()
    if (session?.user?.role !== "ADMIN") redirect("/")

    const companies = await getCompanies()

    return (
        <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
            <div className="max-w-7xl mx-auto px-6 py-8">
                <div className="mb-8">
                    {/* Header handled by layout */}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-1">
                        <div className="bg-card border border-border rounded-xl p-6 sticky top-8">
                            <h2 className="text-xl font-semibold mb-4 text-foreground">Nuova Azienda</h2>
                            <CreateCompanyForm />
                        </div>
                    </div>

                    <div className="lg:col-span-2">
                        <div className="bg-card border border-border rounded-xl overflow-hidden">
                            <CompanyList companies={companies} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
