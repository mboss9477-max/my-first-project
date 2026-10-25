import { getPayload, type Payload } from 'payload'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { resetSubscribeLimit, subscribeHandler } from '../src/endpoints/subscribe'
import { useTestDatabase } from './helpers/testDatabase'

/**
 * Newsletter signup through the CMS (runbook gap G-1). The collection stays
 * admin-only; the website adds subscribers through one secret-protected endpoint.
 */
let payload: Payload
const SECRET = 'subscribe-secret-for-tests'

beforeAll(async () => {
  await useTestDatabase('subscribe')
  const { default: config } = await import('../src/payload.config')
  payload = await getPayload({ config })
})

afterAll(async () => {
  await payload?.destroy?.()
})

beforeEach(() => {
  vi.stubEnv('SUBSCRIBE_SECRET', SECRET)
  resetSubscribeLimit()
})

afterEach(() => {
  vi.unstubAllEnvs()
})

type Call = { secret?: string | null; body?: unknown; rawBody?: string }
async function call({ secret = SECRET, body, rawBody }: Call) {
  const headers = new Headers({ 'content-type': 'application/json' })
  if (secret !== null) headers.set('x-subscribe-secret', secret)
  const request = new Request('http://cms.test/api/newsletter-subscribers/subscribe', {
    method: 'POST',
    headers,
    body: rawBody ?? JSON.stringify(body),
  })
  const response = await subscribeHandler(Object.assign(request, { payload }) as never)
  return { status: response.status, json: (await response.json()) as Record<string, unknown> }
}

const count = async () => (await payload.count({ collection: 'newsletter-subscribers' })).totalDocs
const emails = async () =>
  (await payload.find({ collection: 'newsletter-subscribers', limit: 100, depth: 0 })).docs.map((d) => d.email)

describe('newsletter signup endpoint', () => {
  it('is mounted on the collection at POST /subscribe', () => {
    const endpoints = payload.collections['newsletter-subscribers'].config.endpoints
    expect(Array.isArray(endpoints) ? endpoints.map((e) => `${e.method} ${e.path}`) : []).toContain('post /subscribe')
  })

  it('refuses everything when no secret is configured (fails closed)', async () => {
    vi.stubEnv('SUBSCRIBE_SECRET', '')
    const before = await count()
    expect((await call({ body: { email: 'a@example.test' } })).status).toBe(503)
    expect(await count()).toBe(before)
  })

  it('refuses a missing or wrong secret', async () => {
    const before = await count()
    expect((await call({ secret: null, body: { email: 'nosecret@example.test' } })).status).toBe(401)
    expect((await call({ secret: 'wrong', body: { email: 'wrongsecret@example.test' } })).status).toBe(401)
    expect((await call({ secret: `${SECRET}x`, body: { email: 'longer@example.test' } })).status).toBe(401)
    expect(await count()).toBe(before)
  })

  it('adds a new subscriber with the time of signup', async () => {
    const result = await call({ body: { email: 'new@example.test' } })
    expect(result).toEqual({ status: 200, json: { ok: true } })
    const doc = (
      await payload.find({ collection: 'newsletter-subscribers', where: { email: { equals: 'new@example.test' } } })
    ).docs[0]
    expect(doc.subscribedAt).toBeTruthy()
    expect(Math.abs(Date.now() - new Date(doc.subscribedAt).getTime())).toBeLessThan(60_000)
  })

  it('de-duplicates by email, ignoring case and spaces, and answers the same', async () => {
    const first = await call({ body: { email: 'Dup@Example.test' } })
    const second = await call({ body: { email: '  dup@example.TEST ' } })
    expect(second).toEqual(first) // never reveals that the address was already on the list
    expect((await emails()).filter((e) => e === 'dup@example.test')).toHaveLength(1)
  })

  it('survives two simultaneous signups for the same address', async () => {
    const results = await Promise.all([
      call({ body: { email: 'race@example.test' } }),
      call({ body: { email: 'race@example.test' } }),
    ])
    expect(results.map((r) => r.status)).toEqual([200, 200])
    expect((await emails()).filter((e) => e === 'race@example.test')).toHaveLength(1)
  })

  it('rejects bad input', async () => {
    const before = await count()
    expect((await call({ body: { email: 'not-an-email' } })).status).toBe(400)
    expect((await call({ body: { email: 'a'.repeat(260) + '@example.test' } })).status).toBe(400)
    expect((await call({ body: { email: 42 } })).status).toBe(400)
    expect((await call({ body: {} })).status).toBe(400)
    expect((await call({ rawBody: 'not json' })).status).toBe(400)
    expect((await call({ rawBody: 'null' })).status).toBe(400)
    expect((await call({ rawBody: '[]' })).status).toBe(400)
    expect((await call({ rawBody: JSON.stringify({ email: 'big@example.test', pad: 'x'.repeat(2000) }) })).status).toBe(413)
    expect(await count()).toBe(before)
  })

  it('rejects addresses with null bytes or control characters with a clean 400 (finding ADV2-3)', async () => {
    const before = await count()
    for (const email of ['a\u0000@example.test', 'a@exa\u0000mple.test', 'a\u0001b@example.test', 'a@example.test\u007f']) {
      expect((await call({ body: { email } })).status).toBe(400)
    }
    expect(await count()).toBe(before)
  })

  it('refuses an oversized body by its declared length before reading it (finding ADV2-2)', async () => {
    const headers = new Headers({ 'content-type': 'application/json', 'x-subscribe-secret': SECRET, 'content-length': '5000000' })
    const request = new Request('http://cms.test/api/newsletter-subscribers/subscribe', {
      method: 'POST',
      headers,
      body: JSON.stringify({ email: 'declared@example.test' }),
    })
    const response = await subscribeHandler(Object.assign(request, { payload }) as never)
    expect(response.status).toBe(413)
    expect((await emails()).includes('declared@example.test')).toBe(false)
  })

  it('stops reading a body that is longer than the limit even when the declared length lies', async () => {
    const big = JSON.stringify({ email: 'big2@example.test', pad: 'x'.repeat(50_000) })
    expect((await call({ rawBody: big })).status).toBe(413)
  })

  it('answers 500, not a crash, when saving and the follow-up lookup both fail', async () => {
    const create = vi.spyOn(payload, 'create').mockRejectedValue(new Error('db down'))
    const find = vi.spyOn(payload, 'find').mockRejectedValue(new Error('db down'))
    try {
      const request = new Request('http://cms.test/api/newsletter-subscribers/subscribe', {
        method: 'POST',
        headers: new Headers({ 'x-subscribe-secret': SECRET, 'content-type': 'application/json' }),
        body: JSON.stringify({ email: 'dbdown@example.test' }),
      })
      // The first lookup throws too: that must not escape as an unhandled error.
      const response = await subscribeHandler(Object.assign(request, { payload }) as never)
      expect(response.status).toBe(500)
    } finally {
      create.mockRestore()
      find.mockRestore()
    }
  })

  it('caps requests per window as a backstop, and recovers when the window passes', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    try {
      const start = new Date('2026-10-25T12:00:00Z')
      vi.setSystemTime(start)
      for (let i = 0; i < 100; i++) {
        expect((await call({ body: { email: `flood${i}@example.test` } })).status).toBe(200)
      }
      expect((await call({ body: { email: 'flood-extra@example.test' } })).status).toBe(429)
      expect((await emails()).includes('flood-extra@example.test')).toBe(false)

      vi.setSystemTime(new Date(start.getTime() + 11 * 60 * 1000))
      expect((await call({ body: { email: 'flood-later@example.test' } })).status).toBe(200)
    } finally {
      vi.useRealTimers()
    }
  })

  it('keeps the normal API closed to the public: no read, list or direct create', async () => {
    await expect(payload.find({ collection: 'newsletter-subscribers', overrideAccess: false })).rejects.toThrow()
    await expect(
      payload.create({
        collection: 'newsletter-subscribers',
        data: { email: 'direct@example.test', subscribedAt: new Date().toISOString() },
        overrideAccess: false,
      }),
    ).rejects.toThrow()
    expect((await emails()).includes('direct@example.test')).toBe(false)
  })

  it('never writes an address to the log', async () => {
    const logged: string[] = []
    const spies = (['info', 'warn', 'error'] as const).map((level) =>
      vi.spyOn(payload.logger, level).mockImplementation(((...args: unknown[]) => {
        logged.push(JSON.stringify(args))
      }) as never),
    )
    try {
      await call({ body: { email: 'private-address@example.test' } })
      await call({ body: { email: 'private-address@example.test' } })
      for (let i = 0; i < 101; i++) await call({ body: { email: `private-flood${i}@example.test` } })
    } finally {
      spies.forEach((spy) => spy.mockRestore())
    }
    expect(logged.join(' ')).not.toContain('private-')
  })
})
