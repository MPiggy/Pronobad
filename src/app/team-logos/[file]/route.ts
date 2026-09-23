import type { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { teamIdFromLogoFile } from '@/lib/teams/logo'

/**
 * Serves a team's logo: `/team-logos/<teamId>.webp?v=<version>`.
 *
 * Public, like the club crests themselves — and the `.webp` ending keeps the
 * proxy from refreshing a session for each one (see src/proxy.ts's matcher).
 *
 * The bytes were normalised to WebP on upload, so there is only one content
 * type to serve. A request carrying the version `teamLogoUrl` put in the URL
 * is cached for good: a new upload changes the version, and with it the URL.
 */
export async function GET(
  request: NextRequest,
  ctx: RouteContext<'/team-logos/[file]'>,
) {
  const { file } = await ctx.params
  const teamId = teamIdFromLogoFile(file)

  if (!teamId) return new Response(null, { status: 404 })

  const logo = await db.teamLogo.findUnique({
    where: { teamId },
    select: { data: true },
  })

  if (!logo) return new Response(null, { status: 404 })

  const versioned = request.nextUrl.searchParams.has('v')

  return new Response(logo.data, {
    headers: {
      'Content-Type': 'image/webp',
      'Cache-Control': versioned
        ? 'public, max-age=31536000, immutable'
        : 'public, max-age=300',
    },
  })
}
