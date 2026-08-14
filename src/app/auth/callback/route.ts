import { NextResponse, type NextRequest } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'
import { safeRedirectPath } from '@/lib/auth/redirect'
import { getCurrentUser } from '@/lib/auth/session'
import { siteUrl } from '@/lib/env'
import { createClient } from '@/lib/supabase/server'

/**
 * Lands the member after they click the magic link.
 *
 * Supabase redirects here with a one-time credential, which is exchanged for a
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

  const next = safeRedirectPath(searchParams.get('next'))

  // Supabase reports a rejected link (expired, already used) this way rather
  // than by omitting the code.
  const authError = searchParams.get('error_description') ?? searchParams.get('error')

  if (authError) {
    return NextResponse.redirect(`${origin}/auth/auth-error`)
  }

  // Two shapes arrive here, and which one depends on the email template.
  //
  //   - `token_hash` + `type` — what Supabase's default `{{ .ConfirmationURL }}`
  //     template produces, by way of its /auth/v1/verify endpoint.
  //   - `code` — the PKCE flow, used when the template points straight at this
  //     callback.
  //
  // Handling only `code` silently breaks the default template: the link lands
  // here with nothing to exchange and bounces to the error page, which reads to
  // the member as the link doing nothing at all.
  const code = searchParams.get('code')
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null

  if (!code && !tokenHash) {
    return NextResponse.redirect(`${origin}/auth/auth-error`)
  }

  const supabase = await createClient()

  const { error } = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : await supabase.auth.verifyOtp({
        // `magiclink`/`email` for sign-in and sign-up links, `recovery` for a
        // password reset. Trusting the parameter keeps all three working; a
        // wrong value simply fails the verification rather than granting
        // anything.
        type: type ?? 'magiclink',
        token_hash: tokenHash!,
      })

  if (error) {
    return NextResponse.redirect(`${origin}/auth/auth-error`)
  }

  // A password-reset link: send them straight to choosing a new password,
  // regardless of where `next` points.
  if (type === 'recovery') {
    return NextResponse.redirect(`${origin}/reset-password`)
  }

  // Create the `User` row now, while we are in a Route Handler that can write
  // cookies, rather than leaving the first Server Component render to do it.
  const user = await getCurrentUser()

  // First time verifying this address: no password or pseudo yet, so land on
  // onboarding instead of wherever `next` was pointing.
  if (user && !user.onboardedAt) {
    return NextResponse.redirect(`${origin}/onboarding`)
  }

  return NextResponse.redirect(`${origin}${next}`)
}
