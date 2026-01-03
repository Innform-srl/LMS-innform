
import { db } from "@/lib/db"
import { CheckCircle, XCircle, Award } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

export default async function VerifyCertificatePage({
    searchParams,
}: {
    searchParams: Promise<{ code?: string }>
}) {
    const { code } = await searchParams

    if (!code) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <Card className="max-w-md w-full p-8 text-center">
                    <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Codice Mancante</h1>
                    <p className="text-gray-600 mb-6">
                        Non è stato fornito alcun codice di verifica.
                    </p>
                    <Link href="/">
                        <Button>Torna alla Home</Button>
                    </Link>
                </Card>
            </div>
        )
    }

    const certificate = await db.certificate.findUnique({
        where: { verificationCode: code },
        include: {
            enrollment: {
                include: {
                    user: true,
                    course: true
                }
            }
        }
    })

    if (!certificate) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <Card className="max-w-md w-full p-8 text-center border-red-200 bg-red-50">
                    <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-red-700 mb-2">Certificato Non Valido</h1>
                    <p className="text-red-600 mb-6">
                        Il codice di verifica fornito non corrisponde ad alcun certificato valido.
                    </p>
                    <Link href="/">
                        <Button variant="outline" className="border-red-200 hover:bg-red-100 text-red-700">
                            Torna alla Home
                        </Button>
                    </Link>
                </Card>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <Card className="max-w-2xl w-full p-8 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 to-purple-500" />

                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4">
                        <CheckCircle className="w-10 h-10 text-green-600" />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900">Certificato Valido</h1>
                    <p className="text-green-600 font-medium mt-2">
                        Questo certificato è autentico e verificato.
                    </p>
                </div>

                <div className="bg-white border border-gray-200 rounded-xl p-6 mb-8 shadow-sm">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <p className="text-sm text-gray-500 mb-1">Intestato a</p>
                            <p className="text-lg font-bold text-gray-900">
                                {certificate.enrollment.user.name || certificate.enrollment.user.email}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 mb-1">Corso</p>
                            <p className="text-lg font-bold text-gray-900">
                                {certificate.enrollment.course.title}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 mb-1">Data di Rilascio</p>
                            <p className="text-lg font-medium text-gray-900">
                                {certificate.issuedAt.toLocaleDateString('it-IT', {
                                    day: 'numeric',
                                    month: 'long',
                                    year: 'numeric'
                                })}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 mb-1">Numero Certificato</p>
                            <p className="font-mono text-gray-700 bg-gray-100 px-2 py-1 rounded inline-block">
                                {certificate.certificateNumber}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="text-center">
                    <p className="text-sm text-gray-500 mb-6">
                        Verificato il {new Date().toLocaleDateString('it-IT')} alle {new Date().toLocaleTimeString('it-IT')}
                    </p>
                    <Link href="/">
                        <Button className="bg-indigo-600 hover:bg-indigo-700">
                            Vai alla Piattaforma
                        </Button>
                    </Link>
                </div>
            </Card>
        </div>
    )
}
