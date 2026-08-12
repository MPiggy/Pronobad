import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { supabasePublishableKey, supabaseUrl } from '@/lib/env'

/**
 * Supabase client for Server Components, Server Actions and Route Handlers.
 *
 * A new client per request, never a module-level singleton: one shared client
 * would leak one user's session into another user's request.
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(supabaseUrl(), supabasePublishableKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options)
          }
        } catch {
          // Server Components cannot write cookies — Next.js throws here by
          // design. This is safe to ignore *because* src/proxy.ts refreshes the
          // session on every request and writes the result to the response.
          // Remove that proxy and this catch starts silently dropping refreshed
          // tokens, which looks like random logouts.
        }
      },
    },
  })
}
