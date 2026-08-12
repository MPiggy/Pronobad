'use client'

import { createBrowserClient } from '@supabase/ssr'
import { supabasePublishableKey, supabaseUrl } from '@/lib/env'

/**
 * Supabase client for browser code.
 *
 * `createBrowserClient` is a singleton by default, so calling this on every
 * render is cheap and does not open a new connection each time.
 */
export function createClient() {
  return createBrowserClient(supabaseUrl(), supabasePublishableKey())
}
