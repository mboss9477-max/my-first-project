import { getPayload, type Payload } from 'payload'
import sharp from 'sharp'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import type { User } from '../src/payload-types'
import { useTestDatabase } from './helpers/testDatabase'

/** Image handling (plan P0.7): sizes, focal point, type limits, large uploads. */
let payload: Payload
let writer: User

async function jpeg(width: number, height: number) {
  return sharp({ create: { width, height, channels: 3, background: { r: 180, g: 140, b: 60 } } })
    .jpeg({ quality: 90 })
    .toBuffer()
}

const asFile = (data: Buffer, name: string, mimetype: string) => ({ data, name, mimetype, size: data.length })

beforeAll(async () => {
  await useTestDatabase('media')
  const { default: config } = await import('../src/payload.config')
  payload = await getPayload({ config })
  writer = await payload.create({
    collection: 'users',
    data: { email: 'writer@example.test', password: `pw-${Date.now()}`, role: 'writer' },
  })
})

afterAll(async () => {
  await payload?.destroy?.()
})

describe('media uploads', () => {
  it('generates the thumbnail, card and hero sizes from a large photo', async () => {
    const doc = await payload.create({
      collection: 'media',
      data: { alt: 'Test photo' },
      file: asFile(await jpeg(3000, 2000), 'photo.jpg', 'image/jpeg'),
      user: writer,
      overrideAccess: false,
    })
    expect(doc.width).toBe(3000)
    expect(doc.sizes?.thumbnail?.width).toBe(400)
    expect(doc.sizes?.card?.width).toBe(768)
    expect(doc.sizes?.hero?.width).toBe(1600)
    expect(doc.sizes?.hero?.height).toBe(900)
  })

  it('stores a focal point the editor sets', async () => {
    const doc = await payload.create({
      collection: 'media',
      data: { alt: 'Focal test', focalX: 20, focalY: 80 },
      file: asFile(await jpeg(1600, 900), 'focal.jpg', 'image/jpeg'),
      user: writer,
      overrideAccess: false,
    })
    expect(doc.focalX).toBe(20)
    expect(doc.focalY).toBe(80)
  })

  it('requires alt text', async () => {
    await expect(
      payload.create({
        collection: 'media',
        data: {} as never,
        file: asFile(await jpeg(800, 600), 'no-alt.jpg', 'image/jpeg'),
        user: writer,
        overrideAccess: false,
      }),
    ).rejects.toMatchObject({ status: 400 })
  })

  it('rejects files that are not allowed image types', async () => {
    const html = Buffer.from('<html><script>alert(1)</script></html>')
    const error = await payload
      .create({
        collection: 'media',
        data: { alt: 'Not an image' },
        file: asFile(html, 'evil.html', 'text/html'),
        user: writer,
        overrideAccess: false,
      })
      .then(
        () => null,
        (err: { status?: number }) => err,
      )
    expect(error, 'an HTML upload must be refused').not.toBeNull()
    expect(error?.status).toBe(400)
  })

  it('rejects a non-image file renamed to .jpg', async () => {
    const fake = Buffer.from('this is not really a jpeg')
    const error = await payload
      .create({
        collection: 'media',
        data: { alt: 'Fake jpeg' },
        file: asFile(fake, 'fake.jpg', 'image/jpeg'),
        user: writer,
        overrideAccess: false,
      })
      .then(
        () => null,
        (err: { status?: number }) => err,
      )
    expect(error, 'content that is not an image must be refused').not.toBeNull()
  })

  it('records how long and how much memory a 6000x4000 upload takes', async () => {
    // Random pixels compress like a detailed camera photo (a flat colour would
    // shrink to ~0.1 MB and measure nothing).
    const width = 6000
    const height = 4000
    const noise = Buffer.alloc(width * height * 3)
    for (let i = 0; i < noise.length; i++) noise[i] = (i * 2654435761) >>> 24
    const big = await sharp(noise, { raw: { width, height, channels: 3 } }).jpeg({ quality: 92 }).toBuffer()
    const before = process.memoryUsage().rss
    const started = Date.now()
    await payload.create({
      collection: 'media',
      data: { alt: 'Big photo' },
      file: asFile(big, 'big.jpg', 'image/jpeg'),
      user: writer,
      overrideAccess: false,
    })
    const seconds = (Date.now() - started) / 1000
    const deltaMb = (process.memoryUsage().rss - before) / 1024 / 1024
    console.log(`big upload: ${(big.length / 1024 / 1024).toFixed(1)} MB file, ${seconds}s, RSS +${deltaMb.toFixed(0)} MB`)
    expect(seconds).toBeLessThan(30)
  })
})
