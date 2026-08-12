import { NextResponse } from 'next/server'
import { siteUrl } from '@/lib/env'
import { createClient } from '@/lib/supabase/server'

/**
 * Signs the member out.
 *
 * POST only: a GET would let any page log a member out with an `<img>` tag
 * pointing here, and browsers pre-fetching links would do it by accident.
 */
export async function POST() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    await supabase.auth.signOut()
  }

  return NextResponse.redirect(`${siteUrl()}/login`, {
    // 303 so the browser follows with GET rather than repeating the POST.
    status: 303,
  })
}
