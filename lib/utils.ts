import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateCertificateNumber(): string {
  const prefix = "CERT"
  const date = new Date()
  const year = date.getFullYear()
  const random = Math.random().toString(36).substring(2, 10).toUpperCase()
  return `${prefix}-${year}-${random}`
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('it-IT', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
}
