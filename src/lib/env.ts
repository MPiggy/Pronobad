/**
 * Environment access, validated once and in one place.
 *
 * Supabase misconfiguration otherwise surfaces as an opaque auth failure at
 * runtime ("Invalid API key" on a magic link that looks fine), which is a slow
 * thing to debug. Reading through here turns it into a named error instead.
 *
 * `NEXT_PUBLIC_*` values are inlined by the bundler at build time, so they must
 * be read as complete `process.env.X` expressions — never `process.env[key]`.
 */

function required(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(
      `${name} is not set. Copy .env.example to .env and fill it in — see README.md.`,
    )
  }

  return value
}

export const supabaseUrl = () =>
  required(process.env.NEXT_PUBLIC_SUPABASE_URL, 'NEXT_PUBLIC_SUPABASE_URL')

export const supabasePublishableKey = () =>
  required(
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  )

/**
 * Base URL used to build magic-link redirects.
 *
 * Vercel exposes the deployment host but not the scheme, and preview
 * deployments get a different host on every push — so an explicitly configured
 * NEXT_PUBLIC_SITE_URL wins, with the Vercel value as the fallback that keeps
 * previews working without per-deployment configuration.
 */
export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL
  if (explicit) return explicit.replace(/\/$/, '')

  // `VERCEL_URL`, not `NEXT_PUBLIC_VERCEL_URL`: this function runs in server
  // code (the login action), and Vercel only injects the un-prefixed name into
  // the server runtime. Reading the NEXT_PUBLIC_ one here yields undefined on
  // every deployment — which used to fall through to the localhost default
  // below, sending Supabase a redirect it rejects. The rejection is silent: the
  // magic link still arrives, but points at the site root instead of the
  // callback, so the member lands back on the login page.
  const vercel = process.env.VERCEL_URL ?? process.env.NEXT_PUBLIC_VERCEL_URL
  if (vercel) return `https://${vercel}`

  // Only correct in local development. On a deployment this value would be
  // wrong in a way that breaks login, so fail loudly rather than emit links
  // that point at the developer's own machine.
  if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
    throw new Error(
      'NEXT_PUBLIC_SITE_URL is not set. Magic-link redirects would point at localhost — set it to the deployment URL.',
    )
  }

  return 'http://localhost:3000'
}
