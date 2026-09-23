import type { MetadataRoute } from 'next'

/**
 * Web app manifest — what turns the site into something a member can add to
 * their phone's home screen and open without browser chrome.
 *
 * `start_url` is `/` rather than `/fixtures`: the root already redirects a
 * signed-in member to the fixtures and shows the pitch to everyone else, so
 * the icon lands on the right screen either way.
 *
 * `id` pins the app's identity independently of `start_url` — changing the
 * start URL later would otherwise register as a second, separate app on
 * devices that already installed this one.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'BetClichy — Le concours de prono',
    short_name: 'BetClichy',
    description:
      'Pronostiquez les rencontres interclubs du club et grimpez au classement.',
    lang: 'fr',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    // Every screen is a single max-w-md column built for a thumb; landscape
    // only ever stretches it.
    orientation: 'portrait',
    // Matches `--color-shuttle` in globals.css and the viewport theme colour,
    // so the splash screen and status bar are the same near-black as the app.
    background_color: '#15202f',
    theme_color: '#15202f',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      {
        // Android crops icons to its own shape; the maskable variant is the
        // logo inset inside the 80% safe zone so nothing gets clipped.
        src: '/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
