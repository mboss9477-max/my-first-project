import { rmSync } from 'fs'
import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import type { User } from '../src/payload-types'

let payload: Payload
let admin: User
let editor: User
let writer: User
let otherWriter: User
let categoryId: number

const asUser = (user: User) => ({ user, overrideAccess: false }) as const

/**
 * Asserts the call was refused by access control, not by validation or some
 * other error: Payload answers 403 (Forbidden), or 404 when an access
 * constraint hides the document from that user.
 */
async function expectDenied(call: Promise<unknown>) {
  const error = await call.then(
    () => null,
    (err: unknown) => err as { status?: number; name?: string; message?: string },
  )
  expect(error, 'expected the call to be refused').not.toBeNull()
  expect([403, 404], `${error?.name}: ${error?.message}`).toContain(error?.status)
}

async function makeStaff(email: string, role: 'admin' | 'editor' | 'writer') {
  return payload.create({
    collection: 'users',
    data: { email, password: `test-${role}-${Date.now()}`, role },
  })
}

beforeAll(async () => {
  for (const suffix of ['', '-journal', '-wal', '-shm']) {
    rmSync(`./cms-test.db${suffix}`, { force: true })
  }
  const { default: config } = await import('../src/payload.config')
  payload = await getPayload({ config })

  admin = await makeStaff('admin@example.test', 'admin')
  editor = await makeStaff('editor@example.test', 'editor')
  writer = await makeStaff('writer@example.test', 'writer')
  otherWriter = await makeStaff('writer2@example.test', 'writer')

  const category = await payload.create({
    collection: 'categories',
    data: { name: 'Politics', slug: 'politics' },
  })
  categoryId = category.id
})

afterAll(async () => {
  await payload?.destroy?.()
})

describe('writer role', () => {
  it('can create a draft and is recorded as its creator', async () => {
    const draft = await payload.create({
      collection: 'articles',
      data: { headline: 'Draft one', slug: 'draft-one', category: categoryId, _status: 'draft' },
      draft: true,
      ...asUser(writer),
    })
    const createdBy = typeof draft.createdBy === 'object' ? draft.createdBy?.id : draft.createdBy
    expect(createdBy).toBe(writer.id)
  })

  it('cannot create an article as published', async () => {
    await expectDenied(
      payload.create({
        collection: 'articles',
        data: { headline: 'Sneaky', slug: 'sneaky', category: categoryId, _status: 'published' },
        ...asUser(writer),
      }),
    )
  })

  it('can edit its own draft but cannot publish it', async () => {
    const draft = await payload.create({
      collection: 'articles',
      data: { headline: 'Own draft', slug: 'own-draft', category: categoryId, _status: 'draft' },
      draft: true,
      ...asUser(writer),
    })

    const edited = await payload.update({
      collection: 'articles',
      id: draft.id,
      data: { headline: 'Own draft, edited' },
      draft: true,
      ...asUser(writer),
    })
    expect(edited.headline).toBe('Own draft, edited')

    await expectDenied(
      payload.update({
        collection: 'articles',
        id: draft.id,
        data: { _status: 'published' },
        ...asUser(writer),
      }),
    )
  })

  it("cannot edit another writer's draft", async () => {
    const theirs = await payload.create({
      collection: 'articles',
      data: { headline: 'Theirs', slug: 'theirs', category: categoryId, _status: 'draft' },
      draft: true,
      ...asUser(otherWriter),
    })
    await expectDenied(
      payload.update({
        collection: 'articles',
        id: theirs.id,
        data: { headline: 'Hijacked' },
        draft: true,
        ...asUser(writer),
      }),
    )
  })

  it('cannot change its own role', async () => {
    const updated = await payload.update({
      collection: 'users',
      id: writer.id,
      data: { role: 'admin' },
      ...asUser(writer),
    })
    expect(updated.role).toBe('writer')
  })

  it('cannot delete articles', async () => {
    const draft = await payload.create({
      collection: 'articles',
      data: { headline: 'Keep me', slug: 'keep-me', category: categoryId, _status: 'draft' },
      draft: true,
      ...asUser(writer),
    })
    await expectDenied(
      payload.delete({ collection: 'articles', id: draft.id, ...asUser(writer) }),
    )
  })
})

describe('editor role', () => {
  it("can publish a writer's draft", async () => {
    const draft = await payload.create({
      collection: 'articles',
      data: { headline: 'For review', slug: 'for-review', category: categoryId, _status: 'draft' },
      draft: true,
      ...asUser(writer),
    })
    const published = await payload.update({
      collection: 'articles',
      id: draft.id,
      data: { _status: 'published' },
      ...asUser(editor),
    })
    expect(published._status).toBe('published')
  })
})

describe('public access', () => {
  it('sees published articles only', async () => {
    const result = await payload.find({
      collection: 'articles',
      overrideAccess: false,
      limit: 100,
    })
    expect(result.docs.length).toBeGreaterThan(0)
    expect(result.docs.every((doc) => doc._status === 'published')).toBe(true)
  })

  it('cannot read newsletter subscribers', async () => {
    await payload.create({
      collection: 'newsletter-subscribers',
      data: { email: 'reader@example.test', subscribedAt: new Date().toISOString() },
      ...asUser(admin),
    })
    await expectDenied(
      payload.find({ collection: 'newsletter-subscribers', overrideAccess: false }),
    )
  })
})
