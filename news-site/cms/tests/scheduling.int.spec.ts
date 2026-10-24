import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import type { User } from '../src/payload-types'
import { useTestDatabase } from './helpers/testDatabase'

/**
 * Scheduled publishing (plan P0.6). Jobs are queued exactly as the admin
 * panel's schedule button does (`@payloadcms/ui` schedulePublishHandler):
 * task `schedulePublish`, default queue, carrying the scheduling user. We run
 * the queue directly instead of waiting for the cron.
 */
let payload: Payload
let editor: User
let writer: User
let categoryId: number

const past = () => new Date(Date.now() - 1000)

async function draftBy(user: User, slug: string) {
  return payload.create({
    collection: 'articles',
    data: { headline: slug, slug, category: categoryId, _status: 'draft' },
    draft: true,
    user,
    overrideAccess: false,
  })
}

async function schedulePublish(user: User, articleId: number, waitUntil: Date) {
  return payload.jobs.queue({
    task: 'schedulePublish',
    waitUntil,
    input: {
      type: 'publish',
      doc: { relationTo: 'articles', value: articleId },
      user: { relationTo: 'users', value: user.id },
    },
  })
}

const statusOf = async (id: number) =>
  (await payload.findByID({ collection: 'articles', id, draft: false }))._status

beforeAll(async () => {
  await useTestDatabase('scheduling')
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

describe('scheduled publishing', () => {
  it("publishes an editor's scheduled article once its time has passed", async () => {
    const article = await draftBy(writer, 'scheduled-by-editor')
    await schedulePublish(editor, article.id, past())
    await payload.jobs.run({ queue: 'default' })
    expect(await statusOf(article.id)).toBe('published')
  })

  it('does not publish before the scheduled time', async () => {
    const article = await draftBy(writer, 'scheduled-future')
    await schedulePublish(editor, article.id, new Date(Date.now() + 60 * 60 * 1000))
    await payload.jobs.run({ queue: 'default' })
    expect(await statusOf(article.id)).not.toBe('published')
  })

  it('a writer cannot publish by scheduling: the schedule is refused when queued (T22)', async () => {
    const article = await draftBy(writer, 'scheduled-by-writer')
    // Before the jobs guard this queued fine and was only refused when it ran.
    await expect(schedulePublish(writer, article.id, past())).rejects.toMatchObject({ status: 403 })
    await payload.jobs.run({ queue: 'default' })
    expect(await statusOf(article.id)).not.toBe('published')
  })
})

describe('drafts and versions', () => {
  it('keeps a version history so changes can be audited and reverted', async () => {
    const article = await draftBy(writer, 'versioned')
    for (const headline of ['second', 'third']) {
      await payload.update({
        collection: 'articles',
        id: article.id,
        data: { headline },
        draft: true,
        user: writer,
        overrideAccess: false,
      })
    }
    const versions = await payload.findVersions({
      collection: 'articles',
      where: { parent: { equals: article.id } },
    })
    expect(versions.totalDocs).toBeGreaterThanOrEqual(3)
  })

  it('a draft edit to a published article does not change what the public sees', async () => {
    const article = await draftBy(writer, 'live-then-edited')
    await payload.update({
      collection: 'articles',
      id: article.id,
      data: { _status: 'published', headline: 'Live headline' },
      user: editor,
      overrideAccess: false,
    })
    await payload.update({
      collection: 'articles',
      id: article.id,
      data: { headline: 'Unpublished edit' },
      draft: true,
      user: editor,
      overrideAccess: false,
    })
    const publicView = await payload.findByID({ collection: 'articles', id: article.id, overrideAccess: false })
    expect(publicView.headline).toBe('Live headline')
  })
})
