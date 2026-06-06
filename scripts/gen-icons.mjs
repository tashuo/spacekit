// Generate extension icons from assets/icon-source.png.
// Trims the white background, masks the rounded-square corners to transparent,
// adds slight padding, and emits public/icon/{16,32,48,128}.png.
// Run: pnpm icons
import sharp from 'sharp'
import { mkdir } from 'node:fs/promises'

const SRC = 'assets/icon-source.png'
const OUT_DIR = 'public/icon'
const SIZES = [16, 32, 48, 128, 192, 512]

await mkdir(OUT_DIR, { recursive: true })

// Trim the flat white border around the rounded square once, up front.
const trimmed = await sharp(SRC).trim({ threshold: 20 }).toBuffer()

for (const size of SIZES) {
  const pad = Math.round(size * 0.04) // small transparent margin
  const inner = size - pad * 2
  const radius = Math.round(inner * 0.23) // knock out the rounded corners

  const square = await sharp(trimmed)
    .resize(inner, inner, { fit: 'fill' })
    .ensureAlpha()
    .composite([
      {
        input: Buffer.from(
          `<svg width="${inner}" height="${inner}"><rect width="${inner}" height="${inner}" rx="${radius}" ry="${radius}" fill="#fff"/></svg>`,
        ),
        blend: 'dest-in',
      },
    ])
    .png()
    .toBuffer()

  await sharp({
    create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: square, top: pad, left: pad }])
    .png()
    .toFile(`${OUT_DIR}/${size}.png`)

  console.log(`✓ ${OUT_DIR}/${size}.png`)
}
