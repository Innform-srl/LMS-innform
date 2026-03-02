import { Prisma, PrismaClient } from "@prisma/client"
import "@/lib/env" // Validate env vars at startup

const SOFT_DELETE_MODELS: Prisma.ModelName[] = ["User", "Enrollment"]

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

const prismaClient = globalForPrisma.prisma || new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  // Connection pool settings for better performance
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
})

// ---- Soft Delete Middleware ----
// Automatically filters out soft-deleted records and converts delete to soft delete
// for User and Enrollment models

// Auto-filter: findMany, findFirst, count
prismaClient.$use(async (params: Prisma.MiddlewareParams, next) => {
  if (params.model && SOFT_DELETE_MODELS.includes(params.model as Prisma.ModelName)) {
    if (params.action === "findMany" || params.action === "findFirst" || params.action === "count") {
      // Only add filter if deletedAt is not explicitly set in the query
      if (!params.args) params.args = {}
      if (!params.args.where) params.args.where = {}
      if (params.args.where.deletedAt === undefined) {
        params.args.where.deletedAt = null
      }
    }

    // findUnique needs special handling - convert to findFirst when adding filter
    if (params.action === "findUnique") {
      if (!params.args) params.args = {}
      if (!params.args.where) params.args.where = {}
      if (params.args.where.deletedAt === undefined) {
        // Convert to findFirst since findUnique can't filter on non-unique fields
        params.action = "findFirst"
        const where = { ...params.args.where }
        // Decompose compound unique keys (e.g. userId_courseId: {userId, courseId})
        // findFirst doesn't support compound key syntax, so flatten them
        for (const [key, value] of Object.entries(where)) {
          if (value && typeof value === "object" && !Array.isArray(value) && !(value instanceof Date)) {
            delete (where as Record<string, unknown>)[key]
            Object.assign(where, value)
          }
        }
        params.args.where = { ...where, deletedAt: null }
      }
    }

    // Convert delete to soft delete (update with deletedAt)
    if (params.action === "delete") {
      params.action = "update"
      params.args.data = { deletedAt: new Date() }
    }
    if (params.action === "deleteMany") {
      params.action = "updateMany"
      if (!params.args) params.args = {}
      if (!params.args.data) params.args.data = {}
      params.args.data.deletedAt = new Date()
    }
  }
  return next(params)
})

export const db = prismaClient

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
