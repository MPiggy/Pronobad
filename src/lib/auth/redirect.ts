/**
 * Sanitises the `next` parameter used to return a member to where they were
 * headed before logging in.
 *
 * The value reaches us through a URL and is therefore attacker-controlled: a
 * crafted `?next=https://evil.example` would turn our own login page into a
 * redirect to somewhere else, with our domain lending it credibility. Only
 * paths within this app are allowed through.
 */
export function safeRedirectPath(
  value: string | null | undefined,
  fallback = '/home',
): string {
  if (!value) return fallback

  // Must be a relative path. `//evil.example` is protocol-relative and would
  // leave the site despite starting with a slash, so it is rejected too — as
  // is `/\evil.example`, which some parsers treat the same way.
  if (!value.startsWith('/')) return fallback
  if (value.startsWith('//') || value.startsWith('/\\')) return fallback

  return value
}
