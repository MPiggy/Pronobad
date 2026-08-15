import type { NextConfig } from 'next'

/**
 * Content-Security-Policy.
 *
 * `'unsafe-inline'` on `script-src` is what Next's own bootstrap and streamed
 * flight payloads need; removing it requires per-request nonces threaded from
 * the proxy, which the static shells this app leans on cannot carry. The value
 * of the policy here is therefore in the other directives — nothing may be
 * framed, no plugins, forms cannot post off-site, and connections are limited
 * to this origin plus Supabase.
 *
 * `style-src` allows inline styles because Tailwind's runtime and React's
 * `style` props emit them.
 */
const supabaseOrigin = (() => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL

  if (!url) return ''

  try {
    return new URL(url).origin
  } catch {
    return ''
  }
})()

const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  `connect-src 'self' ${supabaseOrigin}`.trim(),
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ')

const nextConfig: NextConfig = {
  typedRoutes: true,
  cacheComponents: true,
  async headers() {
    return [
      {
        // Every route: these are all safe on static assets too.
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          {
            // Two years, preloadable. HTTPS-only is already true on Vercel;
            // this stops the first plaintext request on repeat visits.
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
          },
        ],
      },
    ]
  },
}

export default nextConfig
