import { getPayload, type Payload } from 'payload'
import sharp from 'sharp'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { MAX_UPLOAD_BYTES } from '../src/collections/uploadRules'
import { slugify } from '../src/collections/slug'
import type { User } from '../src/payload-types'
import { useTestDatabase } from './helpers/testDatabase'

/** Slug generation, review status and friendly upload rules (gaps found in Gemini's walkthrough). */
let payload: Payload
let editor: User
let writer: User
let categoryId: number

const asUser = (user: User) => ({ user, overrideAccess: false }) as const

async function refusal(call: Promise<unknown>) {
  return call.then(
    () => null,
    (err: { status?: number; message?: string; data?: { errors?: Array<{ message?: string }> } }) => err,
  )
}

beforeAll(async () => {
  await useTestDatabase('workflow')
  const { default: config } = await import('../src/payload.config')
  payload = await getPayload({ config })
  const make = (email: string, role: 'editor' | 'writer') =>
    payload.create({ collection: 'users', data: { email, password: `pw-${role}-${Date.now()}`, role } })
  editor = await make('editor@example.test', 'editor')
  writer = await make('writer@example.test', 'writer')
  categoryId = (await payload.create({ collection: 'categories', data: { name: 'News', slug: 'news' } })).id
})

afterAll(async () => {
  await payload?.destroy?.()
})

describe('slugify', () => {
  it('makes readable, URL-safe slugs', () => {
    expect(slugify('Café owners’ 2026 plan: what’s next?')).toBe('cafe-owners-2026-plan-whats-next')
    expect(slugify('  UK  --  Budget!! ')).toBe('uk-budget')
    expect(slugify('x'.repeat(200)).length).toBeLessThanOrEqual(96)
  })
})

describe('article slug', () => {
  it('is generated from the headline when left empty', async () => {
    const article = await payload.create({
      collection: 'articles',
      data: { headline: 'Council Approves New Cycle Lanes', category: categoryId, _status: 'draft' },
      draft: true,
      ...asUser(writer),
    })
    expect(article.slug).toBe('council-approves-new-cycle-lanes')
  })

  it('is never changed when the headline is edited later', async () => {
    const article = await payload.create({
      collection: 'articles',
      data: { headline: 'First headline', category: categoryId, _status: 'draft' },
      draft: true,
      ...asUser(writer),
    })
    const edited = await payload.update({
      collection: 'articles',
      id: article.id,
      data: { headline: 'A completely different headline' },
      draft: true,
      ...asUser(writer),
    })
    expect(edited.slug).toBe('first-headline')
  })

  it('cleans up a badly typed slug instead of storing it', async () => {
    const article = await payload.create({
      collection: 'articles',
      data: { headline: 'Bad slug', slug: 'Bad Slug!', category: categoryId, _status: 'draft' },
      draft: true,
      ...asUser(writer),
    })
    expect(article.slug).toBe('bad-slug')
  })

  it('cannot be published without a slug', async () => {
    const error = await refusal(
      payload.create({
        collection: 'articles',
        data: { headline: '!!!', category: categoryId, _status: 'published' },
        ...asUser(editor),
      }),
    )
    expect(error?.status).toBe(400)
    expect(JSON.stringify(error?.data)).toContain('slug')
  })
})

describe('review status', () => {
  it('starts as "writing" and a writer can hand the draft over for review', async () => {
    const article = await payload.create({
      collection: 'articles',
      data: { headline: 'Ready soon', category: categoryId, _status: 'draft' },
      draft: true,
      ...asUser(writer),
    })
    expect(article.reviewStatus).toBe('writing')
    const handed = await payload.update({
      collection: 'articles',
      id: article.id,
      data: { reviewStatus: 'ready' },
      draft: true,
      ...asUser(writer),
    })
    expect(handed.reviewStatus).toBe('ready')
  })

  it('only an editor can request changes', async () => {
    const article = await payload.create({
      collection: 'articles',
      data: { headline: 'Needs work', category: categoryId, _status: 'draft' },
      draft: true,
      ...asUser(writer),
    })
    const writerTry = await refusal(
      payload.update({
        collection: 'articles',
        id: article.id,
        data: { reviewStatus: 'changes' },
        draft: true,
        ...asUser(writer),
      }),
    )
    expect(writerTry?.status).toBe(403)

    const editorSet = await payload.update({
      collection: 'articles',
      id: article.id,
      data: { reviewStatus: 'changes' },
      draft: true,
      ...asUser(editor),
    })
    expect(editorSet.reviewStatus).toBe('changes')
  })
})

describe('friendly upload rules', () => {
  const asFile = (data: Buffer, name: string, mimetype: string) => ({ data, name, mimetype, size: data.length })

  it('explains iPhone HEIC photos instead of a technical error', async () => {
    const error = await refusal(
      payload.create({
        collection: 'media',
        data: { alt: 'iPhone photo' },
        file: asFile(Buffer.from('not decoded'), 'IMG_0042.HEIC', 'image/heic'),
        ...asUser(writer),
      }),
    )
    expect(error?.status).toBe(400)
    expect(error?.message).toContain('Export it as JPEG')
  })

  it('refuses images over the size limit and says how big they were', async () => {
    const big = await sharp({
      create: { width: 10, height: 10, channels: 3, background: { r: 0, g: 0, b: 0 } },
    })
      .jpeg()
      .toBuffer()
    // Report a size above the limit without allocating it: the rule reads file.size.
    const file = { data: big, name: 'huge.jpg', mimetype: 'image/jpeg', size: MAX_UPLOAD_BYTES + 1 }
    const error = await refusal(
      payload.create({ collection: 'media', data: { alt: 'Too big' }, file, ...asUser(writer) }),
    )
    expect(error?.status).toBe(413)
    expect(error?.message).toContain('under 25 MB')
  })
})
