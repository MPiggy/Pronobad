import { PrismaPg } from '@prisma/adapter-pg'
import { Prisma, PrismaClient } from '@/generated/prisma/client'

/**
 * Prisma 7 talks to Postgres through a driver adapter rather than a Rust
 * engine, so the connection string is passed here rather than read from the
 * schema. This uses the pooled DATABASE_URL — migrations use DIRECT_URL via
 * prisma.config.ts instead.
 */
function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL

  if (!connectionString) {
    throw new Error(
      'DATABASE_URL is not set. Copy .env.example to .env and fill in your Supabase connection strings.',
    )
  }

  const adapter = new PrismaPg({ connectionString })

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  })
}

// Next.js hot-reloads modules in development, which would otherwise open a new
// connection pool on every edit until Postgres refuses new connections.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db = globalForPrisma.prisma ?? createPrismaClient()

/**
 * The client an interactive `$transaction` callback receives — the full client
 * minus the methods that cannot be nested (`$transaction`, `$connect`, …).
 *
 * Helpers that must be able to run either standalone or as part of a larger
 * atomic operation take this type, so the caller decides the boundary. Prisma
 * defines the exact deny list, so it is re-exported rather than re-derived.
 */
export type TransactionClient = Prisma.TransactionClient

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db
}
