import type { NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/proxy'

/**
 * Next 16 renamed the `middleware` file convention to `proxy`; the signature
 * and behaviour are unchanged.
 */
export default async function proxy(request: NextRequest) {
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
