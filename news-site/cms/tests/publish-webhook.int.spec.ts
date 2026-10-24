import { rmSync } from 'fs'
import { getPayload, type Payload } from 'payload'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { affectsLivePage } from '../src/hooks/notifyWeb'
import type { User } from '../src/payload-types'

/** Plan task 1.10: the website is told when published content changes. */
let payload: Payload
let editor: User
let categoryId: number
const sent: Array<{ url: string; secret: string | null; body: Record<string, unknown> }> = []

const settle = () => new Promise((resolve) => setTimeout(resolve, 60))

beforeAll(async () => {
  for (const suffix of ['', '-journal', '-wal', '-shm']) rmSync(`./cms-webhook-test.db${suffix}`, { force: true })
  process.env.DATABASE_URL = 'file:./cms-webhook-test.db'
  const { default: config } = await import('../src/payload.config')
  payload = await getPayload({ config })
  editor = await payload.create({
    collection: 'users',
    data: { email: 'editor@example.test', password: `pw-${Date.now()}-${Math.random()}`, role: 'editor' },
  })
  categoryId = (await payload.create({ collection: 'categories', data: { name: 'World', slug: 'world' } })).id
})

afterAll(async () => {
  await payload?.destroy?.()
})

beforeEach(async () => {
  vi.stubEnv('WEB_REVALIDATE_URL', 'https://web.example.test/api/revalidate-cms')
  vi.stubEnv('WEB_REVALIDATE_SECRET', 'shared-secret-for-tests')
  vi.stubEnv('WEB_REVALIDATE_DELAY_MS', '0')
  sent.length = 0
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init: { headers: Record<string, string>; body: string }) => {
      sent.push({ url, secret: init.headers['x-revalidate-secret'] ?? null, body: JSON.parse(init.body) })
      return new Response('{}', { status: 200 })
    }),
  )
  await settle()
  sent.length = 0
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

const articleCalls = () => sent.filter((call) => call.body.type === 'article')

describe('affectsLivePage', () => {
  it('publishing and unpublishing count; draft saves and pure drafts do not', () => {
    expect(affectsLivePage({ _status: 'published' }, undefined)).toBe(true)
    expect(affectsLivePage({ _status: 'published' }, { _status: 'published' }, 'published')).toBe(true)
    // Draft over a live article: unpublished only if the stored live copy changed.
    expect(affectsLivePage({ _status: 'draft' }, { _status: 'published' }, 'draft')).toBe(true)
    expect(affectsLivePage({ _status: 'draft' }, { _status: 'published' }, 'published')).toBe(false)
    expect(affectsLivePage({ _status: 'draft' }, { _status: 'draft' }, 'draft')).toBe(false)
  })
})

describe('article lifecycle', () => {
  it('publishing notifies the website with the slug and category, using the shared secret', async () => {
    await payload.create({
      collection: 'articles',
      data: { headline: 'Goes live', category: categoryId, _status: 'published' },
      user: editor,
    })
    await settle()
    expect(articleCalls()).toHaveLength(1)
    expect(articleCalls()[0]).toMatchObject({
      url: 'https://web.example.test/api/revalidate-cms',
      secret: 'shared-secret-for-tests',
      body: { type: 'article', slug: 'goes-live', categorySlug: 'world' },
    })
  })

  it('drafts and autosaves of a draft do not notify', async () => {
    const draft = await payload.create({
      collection: 'articles',
      data: { headline: 'Still private', category: categoryId, _status: 'draft' },
      draft: true,
      user: editor,
    })
    await payload.update({ collection: 'articles', id: draft.id, data: { headline: 'Still private v2' }, draft: true, autosave: true, user: editor })
    await settle()
    expect(articleCalls()).toHaveLength(0)
  })

  it('autosaving an edit to a PUBLISHED article does not refresh the live page', async () => {
    const live = await payload.create({
      collection: 'articles',
      data: { headline: 'Live story', category: categoryId, _status: 'published' },
      user: editor,
    })
    await settle()
    sent.length = 0
    await payload.update({ collection: 'articles', id: live.id, data: { headline: 'Live story, half-edited' }, draft: true, autosave: true, user: editor })
    await settle()
    expect(articleCalls()).toHaveLength(0)
  })

  it('unpublishing notifies, because the page must disappear', async () => {
    const live = await payload.create({
      collection: 'articles',
      data: { headline: 'Taken down', category: categoryId, _status: 'published' },
      user: editor,
    })
    await settle()
    sent.length = 0
    await payload.update({ collection: 'articles', id: live.id, data: { _status: 'draft' }, user: editor })
    await settle()
    expect(articleCalls()).toHaveLength(1)
    expect(articleCalls()[0].body.slug).toBe('taken-down')
  })

  it('deleting a published article notifies', async () => {
    const live = await payload.create({
      collection: 'articles',
      data: { headline: 'Deleted story', category: categoryId, _status: 'published' },
      user: editor,
    })
    await settle()
    sent.length = 0
    await payload.delete({ collection: 'articles', id: live.id, user: editor })
    await settle()
    expect(articleCalls()).toHaveLength(1)
  })
})

describe('taxonomy, configuration and failure handling', () => {
  it('a category change notifies', async () => {
    await payload.create({ collection: 'categories', data: { name: 'Science', slug: 'science' }, user: editor })
    await settle()
    expect(sent.some((call) => call.body.type === 'category' && call.body.slug === 'science')).toBe(true)
  })

  it('sends nothing when the URL or secret is not configured', async () => {
    vi.stubEnv('WEB_REVALIDATE_SECRET', '')
    await payload.create({ collection: 'categories', data: { name: 'Quiet', slug: 'quiet' }, user: editor })
    await settle()
    expect(sent).toHaveLength(0)
  })

  it('a failing website never blocks or breaks the editor’s save', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new Error('website unreachable'))))
    const saved = await payload.create({
      collection: 'articles',
      data: { headline: 'Saved anyway', category: categoryId, _status: 'published' },
      user: editor,
    })
    await settle()
    expect(saved.slug).toBe('saved-anyway')
  })
})
