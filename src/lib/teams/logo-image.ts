import sharp from 'sharp'

/**
 * Turns whatever an admin uploads into the one format the app serves.
 *
 * Every logo comes out as a WebP no larger than LOGO_SIZE on its longer side,
 * whatever went in. Three reasons to do it at upload rather than at display:
 *
 * - Size. Club logos arrive as 2000px PNGs and half-megabyte SVGs, to be shown
 *   at 56px at most. Shrunk once here, they cost members a few kilobytes each.
 * - Safety. An SVG is a document that can carry script. Rasterising it means
 *   the app never serves a user-supplied SVG, only pixels.
 * - Framing. Logos are often drawn on a canvas far wider than the mark itself.
 *   Trimming the empty border lets each one fill the same tile.
 */

/** Longer side of a stored logo, in pixels — 4× the largest tile it fills. */
export const LOGO_SIZE = 256

const ACCEPTED_FORMATS = new Set(['png', 'jpeg', 'webp', 'gif', 'svg', 'avif', 'heif'])

/** A file that is not an image this pipeline accepts. */
export class InvalidLogoError extends Error {}

/**
 * Normalises an uploaded image to a trimmed, bounded WebP.
 *
 * Throws InvalidLogoError for anything that is not a readable image.
 */
export async function normalizeLogo(input: Uint8Array): Promise<Uint8Array<ArrayBuffer>> {
  const metadata = await sharp(input)
    .metadata()
    .catch(() => null)

  if (!metadata?.format || !ACCEPTED_FORMATS.has(metadata.format)) {
    throw new InvalidLogoError(
      'Ce fichier n’est pas une image reconnue (PNG, JPEG, WebP, SVG, GIF ou AVIF).',
    )
  }

  // An SVG rasterises at its declared size at 72 dpi. One declared at 40px
  // would come out as a 40px blur, so raise the density until its longer side
  // has pixels to spare after trimming.
  const longerSide = Math.max(metadata.width ?? 0, metadata.height ?? 0)
  const density =
    metadata.format === 'svg' && longerSide > 0
      ? Math.min(2400, Math.max(72, (72 * LOGO_SIZE * 4) / longerSide))
      : undefined

  const render = async (trim: boolean) => {
    // `rotate()` with no angle applies the EXIF orientation of a phone photo.
    let image = sharp(input, { density, animated: false }).rotate()

    // Trims borders matching the top-left pixel, transparent ones included.
    if (trim) image = image.trim()

    const output = await image
      .resize(LOGO_SIZE, LOGO_SIZE, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 90 })
      .toBuffer()

    // A Buffer may be a view into Node's shared pool; Prisma's `Bytes` wants
    // an array that owns a plain ArrayBuffer, so hand it a copy.
    return new Uint8Array(output)
  }

  try {
    return await render(true)
  } catch {
    // Trimming fails on an image that is border all the way through (a blank
    // canvas). Keep it as it is rather than refusing the upload.
    try {
      return await render(false)
    } catch {
      throw new InvalidLogoError('Cette image n’a pas pu être lue.')
    }
  }
}
