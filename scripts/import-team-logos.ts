import 'dotenv/config'
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma/client'
import { normalizeLogo } from '../src/lib/teams/logo-image'

/**
 * Attaches logo files to the current season's teams, by name.
 *
 *   npm run db:logos                  # prisma/team-logos/, for real
 *   npm run db:logos -- --dry-run     # show the matches, write nothing
 *   npm run db:logos -- path/to/dir   # another folder
 *
 * A file named after a club — `clichy.webp`, `carrieres.png` — goes to every
 * team whose name contains that word, accents and case aside: "Clichy 1" and
 * "Clichy 2" both get `clichy`. When two files match one team, the longer
 * name wins, so `saint-maur-2.png` can override `saint-maur.png`.
 *
 * Teams belong to a season, so a new season starts without logos; this is
 * how they come back without re-uploading each one in the admin. Uploading
 * through the admin is the way for a single team.
 *
 * Existing logos are replaced. Files go through the same normalisation as an
 * upload, so any format the admin accepts works here too.
 */

const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.svg', '.gif', '.avif'])

/** "Carrières-sur-Seine 1" → "carrieres sur seine 1". */
function normalizeName(name: string) {
  return name
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

/** Whether `key` appears in `name` as whole words. */
function containsWords(name: string, key: string) {
  return ` ${name} `.includes(` ${key} `)
}

async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const dir = path.resolve(
    args.find((arg) => !arg.startsWith('--')) ?? path.join('prisma', 'team-logos'),
  )

  const files = (await readdir(dir))
    .filter((file) => IMAGE_EXTENSIONS.has(path.extname(file).toLowerCase()))
    .map((file) => ({ file, key: normalizeName(path.parse(file).name) }))
    .filter(({ key }) => key.length > 0)

  const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL

  if (!connectionString) {
    throw new Error('DIRECT_URL (or DATABASE_URL) must be set. See .env.example.')
  }

  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) })

  try {
    const season = await db.season.findFirst({ where: { isCurrent: true } })

    if (!season) throw new Error('No current season: create one in the admin first.')

    const teams = await db.team.findMany({
      where: { seasonId: season.id },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    })

    console.log(`${season.name}: ${teams.length} teams, ${files.length} logo files in ${dir}`)
    if (dryRun) console.log('(dry run — nothing will be written)')
    console.log()

    const used = new Set<string>()
    const normalized = new Map<string, Uint8Array<ArrayBuffer>>()

    for (const team of teams) {
      const match = files
        .filter(({ key }) => containsWords(normalizeName(team.name), key))
        .sort((a, b) => b.key.length - a.key.length)[0]

      if (!match) {
        console.log(`  –  ${team.name}  (no file)`)
        continue
      }

      used.add(match.file)
      console.log(`  ✓  ${team.name}  ←  ${match.file}`)

      if (dryRun) continue

      let data = normalized.get(match.file)
      if (!data) {
        data = await normalizeLogo(new Uint8Array(await readFile(path.join(dir, match.file))))
        normalized.set(match.file, data)
      }

      await db.teamLogo.upsert({
        where: { teamId: team.id },
        create: { teamId: team.id, data },
        update: { data },
      })
    }

    const unused = files.filter(({ file }) => !used.has(file))

    if (unused.length > 0) {
      console.log(`\nNo team matched: ${unused.map(({ file }) => file).join(', ')}`)
    }

    // The app caches fixture lists per season; they pick the new logos up
    // within their `cacheLife` (minutes), or at once on the next team edit.
  } finally {
    await db.$disconnect()
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
