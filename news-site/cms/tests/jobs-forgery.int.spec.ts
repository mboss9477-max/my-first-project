import { REST_GET, REST_POST } from '@payloadcms/next/routes'
import { createLocalReq, getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import type { User } from '../src/payload-types'
import { useTestDatabase } from './helpers/testDatabase'

/**
 * Gemini's review of PR #16 (probe b): a writer names an editor in a job's
 * `input.user`. Two questions: is there any way for a writer to create a job
 * at all, and does the guard refuse the forgery when a signed-in caller makes it?
 */
let payload: Payload
let writer: User
let editor: User
let otherEditor: User
let articleId: number
let config: Awaited<ReturnType<typeof getConfig>>
const PW: Record<string, string> = {}

const getConfig = async () => (await import('../src/payload.config')).default

async function makeUser(email: string, role: 'editor' | 'writer') {
  PW[email] = `pw-${role}-${Date.now()}-${Math.random().toString(36).slice(2)}`
  return payload.create({ collection: 'users', data: { email, password: PW[email], role } })
}

const forgedJob = (userId: number) => ({
  task: 'schedulePublish' as const,
  waitUntil: new Date(Date.now() + 3_600_000),
  input: {
    type: 'publish' as const,
    doc: { relationTo: 'articles' as const, value: articleId },
    user: { relationTo: 'users' as const, value: userId },
  },
})

beforeAll(async () => {
  await useTestDatabase('forgery')
  config = await getConfig()
  payload = await getPayload({ config })
  writer = await makeUser('writer@example.test', 'writer')
  editor = await makeUser('editor@example.test', 'editor')
  otherEditor = await makeUser('editor2@example.test', 'editor')
  const category = await payload.create({ collection: 'categories', data: { name: 'News', slug: 'news' } })
  articleId = (await payload.create({
    collection: 'articles',
    data: { headline: 'Target', category: category.id, _status: 'draft' },
    draft: true,
  })).id
})

afterAll(async () => {
  await payload?.destroy?.()
})

const asActor = async (user: User) => createLocalReq({ user }, payload)
const refusal = (call: Promise<unknown>) =>
  call.then(
    () => null,
    (err: { status?: number; message?: string }) => err,
  )

describe('a signed-in caller cannot schedule in someone else’s name', () => {
  it('a writer naming an editor is refused (the forgery in Gemini’s probe b)', async () => {
    const error = await refusal(payload.jobs.queue({ ...forgedJob(editor.id), req: await asActor(writer) }))
    expect(error?.status).toBe(403)
  })

  it('a writer naming themselves is refused', async () => {
    const error = await refusal(payload.jobs.queue({ ...forgedJob(writer.id), req: await asActor(writer) }))
    expect(error?.status).toBe(403)
  })

  it('an editor naming a different editor is refused', async () => {
    const error = await refusal(payload.jobs.queue({ ...forgedJob(otherEditor.id), req: await asActor(editor) }))
    expect(error?.status).toBe(403)
    expect(error?.message).toContain('own name')
  })

  it('an editor scheduling in their own name works', async () => {
    const job = await payload.jobs.queue({ ...forgedJob(editor.id), req: await asActor(editor) })
    expect(job.id).toBeTruthy()
  })
})

describe('no network door creates jobs', () => {
  it('a signed-in writer cannot create a job over REST, forged or not', async () => {
    const { token } = await payload.login({ collection: 'users', data: { email: writer.email, password: PW[writer.email] } })
    const countJobs = async () =>
      (await payload.find({ collection: 'payload-jobs', where: { taskSlug: { equals: 'schedulePublish' } }, limit: 1 })).totalDocs
    const before = await countJobs()
    const post = REST_POST(config)
    const response = await post(
      new Request('http://localhost:3200/api/payload-jobs', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `JWT ${token}`, origin: 'http://localhost:3200' },
        body: JSON.stringify({
          taskSlug: 'schedulePublish',
          waitUntil: new Date(Date.now() + 3_600_000).toISOString(),
          input: { type: 'publish', doc: { relationTo: 'articles', value: articleId }, user: { relationTo: 'users', value: editor.id } },
        }),
      }),
      { params: Promise.resolve({ slug: ['payload-jobs'] }) },
    )
    expect([401, 403, 404, 405]).toContain(response.status)
    expect(await countJobs(), 'no job may have been created').toBe(before)
  })

  it('a signed-in writer cannot even read the jobs list over REST', async () => {
    const { token } = await payload.login({ collection: 'users', data: { email: writer.email, password: PW[writer.email] } })
    const get = REST_GET(config)
    const response = await get(
      new Request('http://localhost:3200/api/payload-jobs', { headers: { authorization: `JWT ${token}` } }),
      { params: Promise.resolve({ slug: ['payload-jobs'] }) },
    )
    expect([401, 403, 404]).toContain(response.status)
  })
})
