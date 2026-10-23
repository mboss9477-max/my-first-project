import { rmSync } from 'fs'
import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import type { User } from '../src/payload-types'

/** Threat-model T1 (lockout), T4 (sessions), T5 (CSRF origins), T22 (schedule guard). */
let payload: Payload
let editor: User
let writer: User
let articleId: number
const PASSWORDS: Record<string, string> = {}

async function makeUser(email: string, role: 'editor' | 'writer') {
  PASSWORDS[email] = `pw-${role}-${Date.now()}-${Math.random().toString(36).slice(2)}`
  return payload.create({ collection: 'users', data: { email, password: PASSWORDS[email], role } })
}

const login = (email: string, password: string) =>
  payload.login({ collection: 'users', data: { email, password } })

const refusal = (call: Promise<unknown>) =>
  call.then(
    () => null,
    (err: { status?: number; message?: string }) => err,
  )

beforeAll(async () => {
  for (const suffix of ['', '-journal', '-wal', '-shm']) rmSync(`./cms-hardening-test.db${suffix}`, { force: true })
  process.env.DATABASE_URL = 'file:./cms-hardening-test.db'
  const { default: config } = await import('../src/payload.config')
  payload = await getPayload({ config })
  editor = await makeUser('editor@example.test', 'editor')
  writer = await makeUser('writer@example.test', 'writer')
  const category = await payload.create({ collection: 'categories', data: { name: 'News', slug: 'news' } })
  const article = await payload.create({
    collection: 'articles',
    data: { headline: 'Schedule me', category: category.id, _status: 'draft' },
    draft: true,
  })
  articleId = article.id
})

afterAll(async () => {
  await payload?.destroy?.()
})

describe('login lockout (T1)', () => {
  it('locks the account after five wrong passwords, even for the right password', async () => {
    const victim = await makeUser('victim@example.test', 'writer')
    for (let attempt = 1; attempt <= 5; attempt++) {
      const failed = await refusal(login(victim.email, 'wrong-password'))
      expect(failed?.status, `attempt ${attempt}`).toBe(401)
    }
    const locked = await refusal(login(victim.email, PASSWORDS[victim.email]))
    expect(locked?.status).toBe(401)
    expect(locked?.message?.toLowerCase()).toContain('locked')
  })

  it('does not lock on a few mistakes: a correct login still works', async () => {
    const careful = await makeUser('careful@example.test', 'writer')
    for (let attempt = 0; attempt < 3; attempt++) await refusal(login(careful.email, 'oops'))
    const ok = await login(careful.email, PASSWORDS[careful.email])
    expect(ok.token).toBeTruthy()
  })
})

describe('sessions and origins (T4, T5)', () => {
  it('session tokens last two hours', async () => {
    const result = await login(editor.email, PASSWORDS[editor.email])
    const claims = JSON.parse(Buffer.from(result.token!.split('.')[1], 'base64url').toString('utf8'))
    expect(claims.exp - claims.iat).toBe(2 * 60 * 60)
  })

  it('only this CMS origin may send logged-in requests, and cookies are SameSite=Lax', () => {
    const { config } = payload
    // Payload adds serverURL to the list itself, so the entry can appear twice.
    const origin = process.env.CMS_URL || 'http://localhost:3200'
    expect(config.csrf.length).toBeGreaterThan(0)
    expect(config.csrf.every((allowed) => allowed === origin)).toBe(true)
    const users = config.collections.find((c) => c.slug === 'users')!
    const auth = users.auth as { cookies: { sameSite: string }; maxLoginAttempts: number; lockTime: number }
    expect(auth.cookies.sameSite).toBe('Lax')
    expect(auth.maxLoginAttempts).toBe(5)
    expect(auth.lockTime).toBe(10 * 60 * 1000)
  })
})

describe('scheduled publishing guard (T22)', () => {
  const schedule = (user: User, waitUntil = new Date(Date.now() + 3_600_000)) =>
    // Exactly how the admin's schedule button queues a job: no overrideAccess flag.
    payload.jobs.queue({
      task: 'schedulePublish',
      waitUntil,
      input: {
        type: 'publish',
        doc: { relationTo: 'articles', value: articleId },
        user: { relationTo: 'users', value: user.id },
      },
    })

  it('refuses to queue a scheduled publish for a writer', async () => {
    const error = await refusal(schedule(writer))
    expect(error?.status).toBe(403)
    expect(error?.message).toContain('Only an editor can schedule')
  })

  it('lets an editor schedule', async () => {
    const job = await schedule(editor)
    expect(job.id).toBeTruthy()
  })

  it('refuses a writer cancelling an editor’s scheduled publish', async () => {
    const job = await schedule(editor)
    const error = await refusal(payload.delete({ collection: 'payload-jobs', id: job.id, user: writer }))
    expect(error?.status).toBe(403)
    const stillThere = await payload.findByID({ collection: 'payload-jobs', id: job.id })
    expect(stillThere.id).toBe(job.id)
  })

  it('lets an editor cancel a scheduled publish', async () => {
    const job = await schedule(editor)
    await payload.delete({ collection: 'payload-jobs', id: job.id, user: editor })
    const gone = await payload.findByID({ collection: 'payload-jobs', id: job.id }).catch(() => null)
    expect(gone).toBeNull()
  })

  it('the job runner still publishes an editor’s due schedule (the guard does not break cron)', async () => {
    const dueArticle = await payload.create({
      collection: 'articles',
      data: { headline: 'Due now', category: (await payload.find({ collection: 'categories' })).docs[0].id, _status: 'draft' },
      draft: true,
    })
    await payload.jobs.queue({
      task: 'schedulePublish',
      waitUntil: new Date(Date.now() - 1000),
      input: {
        type: 'publish',
        doc: { relationTo: 'articles', value: dueArticle.id },
        user: { relationTo: 'users', value: editor.id },
      },
    })
    await payload.jobs.run({ queue: 'default' })
    const after = await payload.findByID({ collection: 'articles', id: dueArticle.id, draft: false })
    expect(after._status).toBe('published')
  })
})
