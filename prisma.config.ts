import 'dotenv/config'
import { defineConfig, env } from 'prisma/config'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    // DIRECT_URL (unpooled) is the right value here: migrations must not run
    // through a connection pooler. The app itself uses the pooled DATABASE_URL.
    url: env('DIRECT_URL'),
  },
})
