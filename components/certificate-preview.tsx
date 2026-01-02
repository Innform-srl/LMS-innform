"use client"

import { useState } from 'react'
import { Download, X, CheckCircle, Award } from 'lucide-react'

interface CertificatePreviewProps {
    certificateId: string
    userName: string
    courseTitle: string
    certificateNumber: string
    onClose: () => void
}

export function CertificatePreview({
    certificateId,
    userName,
    courseTitle,
    certificateNumber,
    onClose,
}: CertificatePreviewProps) {
    const [isDownloading, setIsDownloading] = useState(false)

    const handleDownload = async () => {
        setIsDownloading(true)
        try {
            const response = await fetch(`/api/certificates/${certificateId}/download`)
            if (!response.ok) throw new Error('Download failed')

            const blob = await response.blob()
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `Certificate-${certificateNumber}.pdf`
            document.body.appendChild(a)
            a.click()
            window.URL.revokeObjectURL(url)
            document.body.removeChild(a)
        } catch (error) {
            console.error('Error downloading certificate:', error)
            alert('Errore nel download del certificato')
        } finally {
            setIsDownloading(false)
        }
    }

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-8 relative animate-in fade-in zoom-in duration-300">
                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* Success Icon with Animation */}
                <div className="flex flex-col items-center mb-6">
                    <div className="relative">
                        <div className="absolute inset-0 bg-green-100 rounded-full animate-ping opacity-75" />
                        <div className="relative bg-green-500 p-4 rounded-full">
                            <Award className="w-12 h-12 text-white" />
                        </div>
                    </div>

                    <h2 className="text-3xl font-bold text-gray-900 mt-6 text-center">
                        🎉 Congratulazioni!
                    </h2>
                    <p className="text-gray-600 mt-2 text-center">
                        Hai completato il corso con successo
                    </p>
                </div>

                {/* Certificate Info */}
                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-6 mb-6 border-2 border-indigo-200">
                    <div className="flex items-start gap-3 mb-4">
                        <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                            <p className="text-sm text-gray-600 mb-1">Corso completato</p>
                            <h3 className="text-xl font-bold text-gray-900">{courseTitle}</h3>
                        </div>
                    </div>

                    <div className="bg-white/80 rounded-lg p-4 border border-indigo-100">
                        <p className="text-sm text-gray-600 mb-1">Certificato rilasciato a</p>
                        <p className="text-lg font-semibold text-gray-900">{userName}</p>
                        <p className="text-xs text-gray-500 mt-2">
                            Numero certificato: {certificateNumber}
                        </p>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                    <button
                        onClick={handleDownload}
                        disabled={isDownloading}
                        className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-200 hover:shadow-xl hover:shadow-indigo-300"
                    >
                        <Download className="w-5 h-5" />
                        {isDownloading ? 'Download in corso...' : 'Scarica Certificato PDF'}
                    </button>

                    <button
                        onClick={onClose}
                        className="px-6 py-3 border-2 border-gray-300 hover:border-gray-400 text-gray-700 font-semibold rounded-xl transition-all duration-200"
                    >
                        Chiudi
                    </button>
                </div>

                {/* Additional Info */}
                <p className="text-center text-sm text-gray-500 mt-4">
                    Il certificato include un codice QR per la verifica dell'autenticità
                </p>
            </div>
        </div>
    )
}
