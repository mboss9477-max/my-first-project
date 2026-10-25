import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import type { User } from '../src/payload-types'
import { useTestDatabase } from './helpers/testDatabase'

/** Writer notes: who may leave, read, change and delete a message about a story. */
let payload: Payload
let writer1: User
let writer2: User
let editor: User
let admin: User
let articleId: number

const password = () => `pw-${Date.now()}-${Math.random()}`
async function user(role: 'writer' | 'editor' | 'admin', name: string) {
  return payload.create({ collection: 'users', data: { email: `${name}@example.test`, password: password(), role } })
}

beforeAll(async () => {
  await useTestDatabase('writer-notes')
  const { default: config } = await import('../src/payload.config')
  payload = await getPayload({ config })
  writer1 = await user('writer', 'writer1')
  writer2 = await user('writer', 'writer2')
  editor = await user('editor', 'editor')
  admin = await user('admin', 'admin')
  const category = await payload.create({ collection: 'categories', data: { name: 'World', slug: 'world' } })
  articleId = (
    await payload.create({
      collection: 'articles',
      data: { headline: 'A story', slug: 'a-story', category: category.id as number, _status: 'published' },
    })
  ).id as number
})

afterAll(async () => {
  await payload?.destroy?.()
})

const as = (u: User) => ({ user: u, overrideAccess: false as const })
const leave = (u: User, text: string, extra: Record<string, unknown> = {}) =>
  payload.create({ collection: 'writer-notes', data: { article: articleId, text, ...extra } as never, ...as(u) })

describe('leaving a note', () => {
  it('any signed-in staff member can leave one, and the author is recorded by the system', async () => {
    const note = await leave(writer1, 'The quote in paragraph 3 needs a source.')
    expect(note.status).toBe('open')
    expect(typeof note.createdBy === 'object' ? note.createdBy?.id : note.createdBy).toBe(writer1.id)
  })

  it('the author cannot be chosen: a forged createdBy is ignored', async () => {
    const note = await leave(writer1, 'Forgery attempt', { createdBy: editor.id })
    const stored = await payload.findByID({ collection: 'writer-notes', id: note.id, depth: 0, overrideAccess: true })
    expect(stored.createdBy).toBe(writer1.id)
  })

  it('a writer cannot create a note that is already resolved', async () => {
    const note = await leave(writer1, 'Sneaky resolved note', { status: 'resolved' })
    const stored = await payload.findByID({ collection: 'writer-notes', id: note.id, depth: 0, overrideAccess: true })
    expect(stored.status).toBe('open')
  })

  it('needs text, within the length limit', async () => {
    await expect(leave(writer1, '')).rejects.toThrow()
    await expect(leave(writer1, 'x'.repeat(2001))).rejects.toThrow()
    await expect(leave(writer1, 'x'.repeat(2000))).resolves.toBeTruthy()
  })

  it('the public cannot leave one', async () => {
    await expect(
      payload.create({ collection: 'writer-notes', data: { article: articleId, text: 'anon' }, overrideAccess: false }),
    ).rejects.toThrow()
  })
})

describe('reading notes', () => {
  it('a writer sees only their own; another writer sees none of them', async () => {
    await leave(writer1, 'Private to writer one')
    await leave(writer2, 'Private to writer two')
    const mine = await payload.find({ collection: 'writer-notes', limit: 100, depth: 0, ...as(writer1) })
    expect(mine.docs.length).toBeGreaterThan(0)
    expect(mine.docs.every((n) => n.createdBy === writer1.id)).toBe(true)
    expect(mine.docs.some((n) => n.text === 'Private to writer two')).toBe(false)
  })

  it('editors and admins see every note', async () => {
    for (const reader of [editor, admin]) {
      const all = await payload.find({ collection: 'writer-notes', limit: 100, depth: 0, ...as(reader) })
      const texts = all.docs.map((n) => n.text)
      expect(texts).toContain('Private to writer one')
      expect(texts).toContain('Private to writer two')
    }
  })

  it('the public cannot read or list notes', async () => {
    await expect(payload.find({ collection: 'writer-notes', overrideAccess: false })).rejects.toThrow()
    const note = await leave(writer1, 'Not for the public')
    await expect(payload.findByID({ collection: 'writer-notes', id: note.id, overrideAccess: false })).rejects.toThrow()
  })

  it('a writer cannot read another writer’s note by its id', async () => {
    const note = await leave(writer2, 'Writer two only')
    await expect(payload.findByID({ collection: 'writer-notes', id: note.id, depth: 0, ...as(writer1) })).rejects.toThrow()
  })
})

describe('changing and deleting notes', () => {
  it('a writer cannot edit or resolve a note, even their own', async () => {
    const note = await leave(writer1, 'Mine, but not editable')
    await expect(
      payload.update({ collection: 'writer-notes', id: note.id, data: { status: 'resolved' }, ...as(writer1) }),
    ).rejects.toThrow()
    await expect(
      payload.update({ collection: 'writer-notes', id: note.id, data: { text: 'changed' }, ...as(writer1) }),
    ).rejects.toThrow()
  })

  it('an editor can mark a note resolved', async () => {
    const note = await leave(writer1, 'Please check the date')
    const updated = await payload.update({ collection: 'writer-notes', id: note.id, data: { status: 'resolved' }, ...as(editor) })
    expect(updated.status).toBe('resolved')
  })

  it('only an admin can delete a note', async () => {
    const note = await leave(writer1, 'To be deleted')
    await expect(payload.delete({ collection: 'writer-notes', id: note.id, ...as(writer1) })).rejects.toThrow()
    await expect(payload.delete({ collection: 'writer-notes', id: note.id, ...as(editor) })).rejects.toThrow()
    await expect(payload.delete({ collection: 'writer-notes', id: note.id, ...as(admin) })).resolves.toBeTruthy()
  })
})

describe('notes stay out of the public articles', () => {
  it('an article read by the public carries no notes', async () => {
    const article = await payload.findByID({ collection: 'articles', id: articleId, overrideAccess: false, depth: 1 })
    expect(JSON.stringify(article)).not.toContain('Private to writer one')
  })
})
