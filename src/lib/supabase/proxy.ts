import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { supabasePublishableKey, supabaseUrl } from '@/lib/env'

/** Routes reachable without a session. Everything else requires one. */
const PUBLIC_PATHS = ['/', '/login', '/auth']

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  )
}

/**
 * Refreshes the Supabase session on every request and gates private routes.
 *
 * Access tokens are short-lived. Without this refresh, a member who leaves a
 * tab open gets logged out mid-session, because Server Components cannot write
 * the refreshed cookie themselves.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(supabaseUrl(), supabasePublishableKey(), {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet, headers) {
        // Written to the request so Server Components rendered later in this
        // same pass see the refreshed token...
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value)
        }

        // ...and to a fresh response so the browser actually stores it.
        response = NextResponse.next({ request })

        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options)
        }

        // Supabase passes no-store headers here. Without them a CDN can cache
        // a response carrying Set-Cookie and hand one member's session to
        // another.
        for (const [key, value] of Object.entries(headers)) {
          response.headers.set(key, value)
        }
      },
    },
  })

  // Must run before the response is returned: a refresh that completes after
  // the response is committed cannot write its cookies, and is lost.
  const { data } = await supabase.auth.getClaims()
  const claims = data?.claims

  const { pathname } = request.nextUrl

  if (!claims && !isPublicPath(pathname)) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    // Send the member back where they were headed once they have clicked the
    // magic link, rather than dumping them on a generic home page.
    loginUrl.searchParams.set('next', pathname)

    return NextResponse.redirect(loginUrl)
  }

  if (claims && pathname === '/login') {
    const homeUrl = request.nextUrl.clone()
    homeUrl.pathname = '/fixtures'
    homeUrl.search = ''

    return NextResponse.redirect(homeUrl)
  }

  return response
}
