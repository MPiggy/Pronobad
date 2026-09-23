import { teamLogoUrl, type TeamDisplay } from '@/lib/teams/logo'

/**
 * A team's logo in a small white tile, or its initial when it has none.
 *
 * The tile is white whatever it sits on — the dark hero or a paper card —
 * because club logos are drawn for white letterheads: black line art, dark
 * lettering. The initial keeps team names aligned in a list where only some
 * teams have a logo yet.
 *
 * Decorative: the team's name is always printed beside it, so the image
 * carries an empty `alt`.
 */

const SIZES = {
  sm: 'size-6 rounded-md p-0.5 text-[0.625rem]',
  md: 'size-10 rounded-lg p-1 text-sm',
  lg: 'size-14 rounded-xl p-1.5 text-lg',
} as const

export function TeamLogo({
  team,
  size = 'sm',
}: {
  team: TeamDisplay
  size?: keyof typeof SIZES
}) {
  const src = teamLogoUrl(team)
  const tile = `flex shrink-0 items-center justify-center bg-white ring-1 ring-black/10 ${SIZES[size]}`

  if (!src) {
    return (
      <span aria-hidden className={`${tile} font-bold text-ink-soft`}>
        {team.name.trim().charAt(0).toUpperCase()}
      </span>
    )
  }

  return (
    <span aria-hidden className={tile}>
      {/* A plain <img>: the route already serves a tiny WebP, so the image
          optimiser would only add a second hop and a second cache. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        loading="lazy"
        decoding="async"
        className="size-full object-contain"
      />
    </span>
  )
}
