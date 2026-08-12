import 'dotenv/config'
import { defineConfig } from 'prisma/config'

/**
 * `prisma generate` only reads the schema and emits TypeScript — it never
 * opens a connection. Using prisma/config's `env()` helper here would still
 * throw when DIRECT_URL is absent, which breaks builds (Vercel sets no
 * migration credentials at build time) for a value that goes unused.
 *
 * Reading process.env directly keeps generate working everywhere, while
 * migrations still fail loudly with a useful message if the URL is missing.
 */
const directUrl =
  process.env.DIRECT_URL ??
  process.env.DATABASE_URL ??
  // Not a working connection: a syntactically valid placeholder so `generate`
  // succeeds. Any command that actually connects fails with the message below.
  'postgresql://unset:unset@localhost:5432/unset'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    // Migrations use the session pooler (5432), not the transaction pooler:
    // they need session-level features PgBouncer's transaction mode lacks.
    url: directUrl,
  },
})
