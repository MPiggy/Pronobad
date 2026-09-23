/*
 * Minimal service worker — registered only so the app is installable.
 *
 * Chrome dropped the service-worker requirement for installing from its menu
 * (108 on mobile, 112 on desktop), but the algorithm that fires
 * `beforeinstallprompt` still looks for a fetch handler. Without this file the
 * in-app install banner would simply never appear on Android.
 *
 * The handler is deliberately empty: not calling `respondWith` leaves every
 * request to the network exactly as it was, so nothing here can stale-serve a
 * streamed RSC payload or a Server Action response. Offline caching, if it is
 * ever wanted, is a separate decision to make here on purpose.
 */

self.addEventListener('install', () => {
  // Replace an older worker straight away rather than waiting for every tab
  // to close — there is no cached state to keep consistent.
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('fetch', () => {})
