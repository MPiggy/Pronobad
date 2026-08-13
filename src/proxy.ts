import { NextResponse, type NextRequest } from 'next/server'
import { isPublicPath, updateSession } from '@/lib/supabase/proxy'
import { DEMO_COOKIE, isDemoMode } from '@/lib/auth/demo'

/**
 * Next 16 renamed the `middleware` file convention to `proxy`; the signature
 * and behaviour are unchanged.
 */
export default async function proxy(request: NextRequest) {
  // Demo mode never talks to Supabase: the name cookie is the session, and
  // the redirect rules mirror the real ones so navigation feels identical.
  if (isDemoMode()) {
    const hasSession = request.cookies.has(DEMO_COOKIE)
    const { pathname } = request.nextUrl

    if (!hasSession && !isPublicPath(pathname)) {
      const loginUrl = request.nextUrl.clone()
      loginUrl.pathname = '/login'
      loginUrl.searchParams.set('next', pathname)

      return NextResponse.redirect(loginUrl)
    }

    if (hasSession && pathname === '/login') {
      const homeUrl = request.nextUrl.clone()
      homeUrl.pathname = '/fixtures'
      homeUrl.search = ''

      return NextResponse.redirect(homeUrl)
    }

    return NextResponse.next()
  }

  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Every path except static assets and images. Running the session refresh
     * on a static file would cost a Supabase round-trip per asset for nothing.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)',
  ],
}
