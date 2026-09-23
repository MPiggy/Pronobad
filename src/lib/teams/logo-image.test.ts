import sharp from 'sharp'
import { describe, expect, it } from 'vitest'
import { InvalidLogoError, LOGO_SIZE, normalizeLogo } from './logo-image'

/** A transparent canvas with an opaque square in the middle. */
async function paddedSquare(canvas: number, square: number) {
  const inset = (canvas - square) / 2

  return new Uint8Array(
    await sharp({
      create: {
        width: canvas,
        height: canvas,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite([
        {
          input: {
            create: {
              width: square,
              height: square,
              channels: 4,
              background: { r: 200, g: 30, b: 30, alpha: 1 },
            },
          },
          top: inset,
          left: inset,
        },
      ])
      .png()
      .toBuffer(),
  )
}

describe('normalizeLogo', () => {
  it('shrinks a large image to LOGO_SIZE, as WebP', async () => {
    const input = new Uint8Array(
      await sharp({
        create: { width: 2000, height: 1000, channels: 3, background: '#123456' },
      })
        .png()
        .toBuffer(),
    )

    const output = await sharp(await normalizeLogo(input)).metadata()

    expect(output.format).toBe('webp')
    expect(output.width).toBe(LOGO_SIZE)
    expect(output.height).toBe(LOGO_SIZE / 2)
  })

  it('trims a transparent border so the mark fills its tile', async () => {
    const output = await sharp(await normalizeLogo(await paddedSquare(200, 40))).metadata()

    expect(output.width).toBe(40)
    expect(output.height).toBe(40)
  })

  it('never enlarges a small raster image', async () => {
    const input = new Uint8Array(
      await sharp({
        create: { width: 50, height: 50, channels: 3, background: '#abcdef' },
      })
        .png()
        .toBuffer(),
    )

    expect((await sharp(await normalizeLogo(input)).metadata()).width).toBe(50)
  })

  it('rasterises a small SVG sharply rather than at its declared size', async () => {
    const svg = new TextEncoder().encode(
      '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="10"><rect width="20" height="10" fill="#c00"/></svg>',
    )

    const output = await sharp(await normalizeLogo(svg)).metadata()

    expect(output.format).toBe('webp')
    expect(output.width).toBe(LOGO_SIZE)
  })

  it('keeps a blank image rather than failing to trim it', async () => {
    const input = new Uint8Array(
      await sharp({
        create: { width: 30, height: 30, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
      })
        .png()
        .toBuffer(),
    )

    expect((await sharp(await normalizeLogo(input)).metadata()).format).toBe('webp')
  })

  it('refuses a file that is not an image', async () => {
    await expect(
      normalizeLogo(new TextEncoder().encode('not an image')),
    ).rejects.toBeInstanceOf(InvalidLogoError)
  })
})
