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

  const vercel = process.env.NEXT_PUBLIC_VERCEL_URL
  if (vercel) return `https://${vercel}`

  return 'http://localhost:3000'
}
