import { rmSync } from 'fs'
import { getPayload, type Payload } from 'payload'
import { GRAPHQL_POST, REST_GET } from '@payloadcms/next/routes'
import sharp from 'sharp'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import type { User } from '../src/payload-types'

let payload: Payload
let configPromise: Promise<any>
let admin: User
let editor: User
let writer1: User
let writer2: User
let categoryId: number
let mediaId: number
let publishedArticleId: number
let writer1DraftId: number
let writer2DraftId: number
let publishedVersionId: string

const asUser = (user?: User) => ({ user, overrideAccess: false }) as const

async function jpeg(width = 100, height = 100) {
  return sharp({ create: { width, height, channels: 3, background: { r: 180, g: 140, b: 60 } } })
    .jpeg({ quality: 80 })
    .toBuffer()
}

const asFile = (data: Buffer, name: string, mimetype: string) => ({ data, name, mimetype, size: data.length })

async function expectDenied(call: Promise<unknown>) {
  const error = await call.then(
    () => null,
    (err: unknown) => err as { status?: number; name?: string; message?: string },
  )
  expect(error, 'expected the call to be refused').not.toBeNull()
  expect([400, 403, 404], `${error?.name}: ${error?.message}`).toContain(error?.status)
}

async function makeStaff(email: string, role: 'admin' | 'editor' | 'writer') {
  return payload.create({
    collection: 'users',
    data: { email, password: `test-${role}-${Date.now()}`, role },
  })
}

beforeAll(async () => {
  for (const suffix of ['', '-journal', '-wal', '-shm']) {
    rmSync(`./cms-adversarial-full.db${suffix}`, { force: true })
  }
  process.env.DATABASE_URL = 'file:./cms-adversarial-full.db'
  configPromise = import('../src/payload.config').then((m) => m.default)
  const config = await configPromise
  payload = await getPayload({ config })

  admin = await makeStaff('admin@adv.test', 'admin')
  editor = await makeStaff('editor@adv.test', 'editor')
  writer1 = await makeStaff('writer1@adv.test', 'writer')
  writer2 = await makeStaff('writer2@adv.test', 'writer')

  const cat = await payload.create({
    collection: 'categories',
    data: { name: 'Adversarial Cat', slug: 'adv-cat' },
  })
  categoryId = cat.id

  const imgBuf = await jpeg()
  const media = await payload.create({
    collection: 'media',
    data: { alt: 'Admin Upload', caption: 'Test' },
    file: asFile(imgBuf, 'test.jpg', 'image/jpeg'),
    ...asUser(admin),
  })
  mediaId = media.id

  const w1Draft = await payload.create({
    collection: 'articles',
    data: { headline: 'Writer 1 Secret Draft', slug: 'w1-draft', category: categoryId, _status: 'draft' },
    draft: true,
    ...asUser(writer1),
  })
  writer1DraftId = w1Draft.id

  const w2Draft = await payload.create({
    collection: 'articles',
    data: { headline: 'Writer 2 Secret Draft', slug: 'w2-draft', category: categoryId, _status: 'draft' },
    draft: true,
    ...asUser(writer2),
  })
  writer2DraftId = w2Draft.id

  const pub = await payload.create({
    collection: 'articles',
    data: { headline: 'Published News Original', slug: 'pub-news', category: categoryId, _status: 'published' },
    ...asUser(editor),
  })
  publishedArticleId = pub.id

  // Create an update on published article so there is an old version to restore
  await payload.update({
    collection: 'articles',
    id: publishedArticleId,
    data: { headline: 'Published News Revised' },
    ...asUser(editor),
  })

  const versions = await payload.findVersions({
    collection: 'articles',
    where: { parent: { equals: publishedArticleId } },
    ...asUser(editor),
  })
  publishedVersionId = String(versions.docs[0]?.id)
})

afterAll(async () => {
  await payload?.destroy?.()
})

describe('CMS Adversarial Access Suite (Cases a-n)', () => {
  // Case a: writer publishes by updating a draft with _status "published" via where clause
  it('Case a: writer cannot publish by updating a draft with _status "published" via where clause', async () => {
    const updateResult = await payload.update({
      collection: 'articles',
      where: { id: { equals: writer1DraftId } },
      data: { _status: 'published' },
      ...asUser(writer1),
    }).catch((err) => err)

    if (updateResult && 'docs' in updateResult) {
      expect(updateResult.docs).toHaveLength(0)
    }

    const verifyDoc = await payload.findByID({
      collection: 'articles',
      id: writer1DraftId,
      draft: true,
      ...asUser(admin),
    })
    expect(verifyDoc._status).toBe('draft')
  })

  // Case b: writer changes createdBy on create or update to another user's id
  it('Case b1: writer cannot spoof createdBy on create to another user id', async () => {
    const forgedArticle = await payload.create({
      collection: 'articles',
      data: {
        headline: 'Forged Ownership',
        slug: 'forged-create',
        category: categoryId,
        createdBy: writer2.id,
        _status: 'draft',
      },
      draft: true,
      ...asUser(writer1),
    })
    const createdBy = typeof forgedArticle.createdBy === 'object' ? forgedArticle.createdBy?.id : forgedArticle.createdBy
    expect(createdBy).toBe(writer1.id)
    expect(createdBy).not.toBe(writer2.id)
  })

  it('Case b2: writer cannot alter createdBy on update to another user id', async () => {
    await payload.update({
      collection: 'articles',
      id: writer1DraftId,
      data: { createdBy: writer2.id },
      draft: true,
      ...asUser(writer1),
    })

    const afterDoc = await payload.findByID({
      collection: 'articles',
      id: writer1DraftId,
      draft: true,
      ...asUser(admin),
    })
    const createdBy = typeof afterDoc.createdBy === 'object' ? afterDoc.createdBy?.id : afterDoc.createdBy
    expect(createdBy).toBe(writer1.id)
    expect(createdBy).not.toBe(writer2.id)
  })

  // Case c: writer reads draft versions of another writer's article (readVersions)
  it('Case c: writer cannot read draft versions of another writer article (readVersions)', async () => {
    const versions = await payload.findVersions({
      collection: 'articles',
      where: { parent: { equals: writer2DraftId } },
      ...asUser(writer1),
    }).catch((err) => err)

    if (versions && 'docs' in versions) {
      expect(versions.docs).toHaveLength(0)
    } else {
      expect([403, 404]).toContain(versions?.status)
    }
  })

  // Case d: anonymous user reads a draft via find with draft: true
  it('Case d: anonymous user cannot read a draft via find with draft: true', async () => {
    const anonResult = await payload.find({
      collection: 'articles',
      draft: true,
      ...asUser(undefined),
    })
    const draftDocs = anonResult.docs.filter((doc) => doc._status !== 'published')
    expect(draftDocs).toHaveLength(0)
  })

  // Case e: anonymous user creates media, categories or articles
  it('Case e: anonymous user cannot create media, categories or articles', async () => {
    await expectDenied(
      payload.create({
        collection: 'articles',
        data: { headline: 'Anon Article', slug: 'anon-art', category: categoryId, _status: 'draft' },
        ...asUser(undefined),
      }),
    )

    await expectDenied(
      payload.create({
        collection: 'categories',
        data: { name: 'Anon Category', slug: 'anon-cat' },
        ...asUser(undefined),
      }),
    )

    await expectDenied(
      payload.create({
        collection: 'media',
        data: { alt: 'Anon Image' },
        file: asFile(await jpeg(), 'anon.jpg', 'image/jpeg'),
        ...asUser(undefined),
      }),
    )
  })

  // Case f: writer deletes or edits media they did not upload
  it('Case f: writer cannot delete or edit media', async () => {
    await expectDenied(
      payload.update({
        collection: 'media',
        id: mediaId,
        data: { alt: 'Hacked Alt' },
        ...asUser(writer1),
      }),
    )

    await expectDenied(
      payload.delete({
        collection: 'media',
        id: mediaId,
        ...asUser(writer1),
      }),
    )
  })

  // Case g: editor tries to change a user's role
  it('Case g: editor cannot change a user role', async () => {
    await payload.update({
      collection: 'users',
      id: writer1.id,
      data: { role: 'admin' },
      ...asUser(editor),
    }).catch((err) => err)

    const checkUser = await payload.findByID({
      collection: 'users',
      id: writer1.id,
      ...asUser(admin),
    })
    expect(checkUser.role).toBe('writer')
    expect(checkUser.role).not.toBe('admin')
  })

  // Case h: writer unpublishes a published article (must be refused)
  it('Case h: writer cannot unpublish a published article', async () => {
    await expectDenied(
      payload.update({
        collection: 'articles',
        id: publishedArticleId,
        data: { _status: 'draft' },
        ...asUser(writer1),
      }),
    )

    const checkArticle = await payload.findByID({
      collection: 'articles',
      id: publishedArticleId,
      draft: true,
      ...asUser(admin),
    })
    expect(checkArticle._status).toBe('published')
  })

  // Case i: writer restores an old version of a published article (must be refused)
  it('Case i: writer cannot restore an old version of a published article', async () => {
    await expectDenied(
      payload.restoreVersion({
        collection: 'articles',
        id: publishedVersionId,
        ...asUser(writer1),
      }),
    )
  })

  // Case j: writer reads or deletes payload-jobs (threat model T22)
  it('Case j1: writer cannot read payload-jobs (threat model T22)', async () => {
    await expectDenied(
      payload.find({
        collection: 'payload-jobs',
        ...asUser(writer1),
      }),
    )
  })

  it('Case j2: writer cannot delete payload-jobs (threat model T22)', async () => {
    const job = await payload.jobs.queue({
      task: 'schedulePublish',
      waitUntil: new Date(Date.now() + 3600000),
      input: {
        type: 'publish',
        doc: { relationTo: 'articles', value: writer1DraftId },
        user: { relationTo: 'users', value: editor.id },
      },
    })

    await expectDenied(
      payload.delete({
        collection: 'payload-jobs',
        id: job.id,
        ...asUser(writer1),
      }),
    )
  })

  // Case k: two articles with the same slug (must be refused)
  it('Case k: two articles with the same slug are refused', async () => {
    await expectDenied(
      payload.create({
        collection: 'articles',
        data: {
          headline: 'Duplicate Slug Article',
          slug: 'pub-news', // already taken by publishedArticleId
          category: categoryId,
          _status: 'draft',
        },
        draft: true,
        ...asUser(editor),
      }),
    )
  })

  // Case l: anonymous GraphQL query for drafts via POST /api/graphql (no drafts returned)
  it('Case l: anonymous GraphQL query cannot read drafts', async () => {
    const postGraphQL = GRAPHQL_POST(configPromise)
    const query = `
      query {
        Articles(draft: true) {
          docs {
            id
            headline
            _status
          }
        }
      }
    `
    const req = new Request('http://localhost:3200/api/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    })

    const res = await postGraphQL(req)
    expect(res.status).toBe(200)
    const json = (await res.json()) as { data?: { Articles?: { docs?: Array<{ id: number; _status: string }> } } }
    const docs = json.data?.Articles?.docs ?? []
    expect(docs.length).toBeGreaterThan(0)
    expect(docs.every((doc) => doc._status === 'published')).toBe(true)
  })

  // Case m: request with a tampered or expired auth cookie (must be treated as anonymous)
  it('Case m: request with tampered auth cookie is treated as anonymous', async () => {
    const getRest = REST_GET(configPromise)
    const req = new Request('http://localhost:3200/api/articles?draft=true', {
      method: 'GET',
      headers: {
        cookie: 'payload-token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.tampered.signature',
      },
    })

    const res = await getRest(req, { params: Promise.resolve({ slug: ['articles'] }) })
    const json = (await res.json()) as { docs?: Array<{ id: number; _status: string }> }
    const docs = json.docs ?? []
    expect(docs.length).toBeGreaterThan(0)
    expect(docs.every((doc) => doc._status === 'published')).toBe(true)
  })

  // Case n: upload a file with an image extension but SVG/HTML content (must be refused)
  it('Case n: upload file with image extension but SVG/HTML content is refused', async () => {
    const evilSvgHtml = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert("XSS")</script></svg>')
    const error = await payload
      .create({
        collection: 'media',
        data: { alt: 'Disguised SVG/HTML' },
        file: asFile(evilSvgHtml, 'photo.jpg', 'image/jpeg'),
        ...asUser(writer1),
      })
      .then(
        () => null,
        (err: unknown) => err as { status?: number; name?: string; message?: string },
      )
    expect(error, 'malicious image upload must be refused').not.toBeNull()
    expect([400, 403, 404, 500], `${error?.name}: ${error?.message}`).toContain(error?.status ?? 400)
  })
})
