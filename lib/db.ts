import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const db = globalForPrisma.prisma || new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  // Connection pool settings for better performance
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
})

// Enable query logging in development for debugging slow queries
if (process.env.NODE_ENV === "development") {
  // @ts-expect-error - Prisma types don't expose $on in all versions
  db.$on?.("query", (e: { query: string; duration: number }) => {
    if (e.duration > 100) {
      console.warn(`Slow query (${e.duration}ms):`, e.query)
    }
  })
}

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db
