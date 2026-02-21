/** Prefix a path with the Next.js basePath so client-side fetch() hits the right URL. */
export function apiUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_BASE_PATH || '/lms'
  return `${base}${path}`
}
