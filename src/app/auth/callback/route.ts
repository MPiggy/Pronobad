import { NextResponse, type NextRequest } from 'next/server'
import { safeRedirectPath } from '@/lib/auth/redirect'
import { getCurrentUser } from '@/lib/auth/session'
import { siteUrl } from '@/lib/env'
import { createClient } from '@/lib/supabase/server'

/**
 * Lands the member after they click the magic link.
 *
 * Supabase redirects here with a one-time `code`, which is exchanged for a
 * session. The exchange must happen server-side — that is what sets the
 * httpOnly session cookies the rest of the app reads.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl

  // Behind Vercel's proxy `request.nextUrl.origin` can be an internal host,
  // which would redirect the member somewhere unreachable. The configured site
  // URL is the same value the magic link was built from, so it is correct by
  // construction.
  const origin = siteUrl()

  const code = searchParams.get('code')
  const next = safeRedirectPath(searchParams.get('next'))

  // Supabase reports a rejected link (expired, already used) this way rather
  // than by omitting the code.
  const authError = searchParams.get('error_description') ?? searchParams.get('error')

  if (authError) {
    return NextResponse.redirect(`${origin}/auth/auth-error`)
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/auth/auth-error`)
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    return NextResponse.redirect(`${origin}/auth/auth-error`)
  }

  // Create the `User` row now, while we are in a Route Handler that can write
  // cookies, rather than leaving the first Server Component render to do it.
  const user = await getCurrentUser()

  // A member with no club cannot predict anything yet, so onboarding takes
  // priority over wherever they were originally headed.
  const destination = user && !user.clubId ? '/onboarding' : next

  return NextResponse.redirect(`${origin}${destination}`)
}
