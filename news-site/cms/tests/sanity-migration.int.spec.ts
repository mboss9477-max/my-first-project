import { getPayload, type Payload } from 'payload'
import sharp from 'sharp'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  applyGuard,
  describeTarget,
  imageDownloadUrl,
  migrateFromSanity,
  renderReport,
  reportFailed,
  type ImageFetcher,
  type MigrationSource,
  type SanityArticle,
  type SanityAsset,
  type SanityBodyBlock,
} from '../src/migration/sanityMigration'
import { useTestDatabase } from './helpers/testDatabase'

/**
 * The Sanity -> CMS migration (plan 1.13) with a fake Sanity and fake images:
 * dry run writes nothing, apply writes and reads back, re-runs do not
 * duplicate, and anything lost is reported rather than hidden.
 */
let payload: Payload
let jpeg: Buffer

const asset = (id: string): SanityAsset => ({
  _id: `image-${id}-1600x900-jpg`,
  url: `https://cdn.example.test/images/${id}-1600x900.jpg`,
  mimeType: 'image/jpeg',
  size: 1000,
  dimensions: { width: 1600, height: 900 },
})

const fetchImage: ImageFetcher = async (a) => ({
  data: jpeg,
  mimetype: 'image/jpeg',
  name: `${a._id}.jpg`,
})

const block = (text: string, extra: Record<string, unknown> = {}): SanityBodyBlock => ({
  _type: 'block',
  _key: `k-${text}`,
  style: 'normal',
  markDefs: [],
  children: [{ _type: 'span', _key: `s-${text}`, text, marks: [] }],
  ...extra,
})

const richBody: SanityBodyBlock[] = [
  { ...block('A heading'), style: 'h2' },
  {
    _type: 'block',
    _key: 'k-link',
    style: 'normal',
    markDefs: [{ _key: 'm1', _type: 'link', href: 'https://example.com' }],
    children: [
      { _type: 'span', _key: 's1', text: 'Read ', marks: [] },
      { _type: 'span', _key: 's2', text: 'this', marks: ['strong', 'm1'] },
    ],
  },
  { ...block('First point'), listItem: 'bullet', level: 1 },
  { ...block('Second point'), listItem: 'bullet', level: 1 },
  { ...block('A quote'), style: 'blockquote' },
  { _type: 'image', _key: 'img1', alt: 'Inline', caption: 'Cap', assetInfo: asset('shared') },
]

const articles: SanityArticle[] = [
  {
    headline: 'Plain story',
    slug: 'plain-story',
    excerpt: 'Short.',
    byline: 'Guest Writer',
    publishedAt: '2026-08-01T10:00:00.000Z',
    updatedAt: '2026-08-02T09:00:00.000Z',
    featured: true,
    category: { name: 'World', slug: 'world' },
    topics: [{ name: 'Climate', slug: 'climate' }],
    author: { name: 'Sam', slug: 'sam' },
    heroImage: { alt: 'A boat', caption: 'At dawn', hotspot: { x: 0.25, y: 0.75 }, asset: asset('shared') },
    corrections: [{ correctedAt: '2026-08-03T08:00:00.000Z', note: 'Fixed a name.' }],
    body: [block('Hello there.'), block('Second paragraph.')],
  },
  {
    headline: 'Rich story',
    slug: 'rich-story',
    publishedAt: '2026-08-05T10:00:00.000Z',
    category: { name: 'World', slug: 'world' },
    heroImage: { alt: '', asset: asset('other') },
    body: richBody,
  },
  {
    headline: 'No category story',
    slug: 'no-category',
    category: null,
    body: [block('Orphan.')],
  },
  {
    headline: 'Lossy story',
    slug: 'lossy-story',
    category: { name: 'World', slug: 'world' },
    body: [
      {
        ...block('Nested'),
        listItem: 'bullet',
        level: 2,
      },
      { _type: 'table', _key: 'weird' } as SanityBodyBlock,
    ],
  },
]

const source: MigrationSource = {
  categories: async () => [{ name: 'World', slug: 'world' }],
  topics: async () => [
    { name: 'Climate', slug: 'climate', trending: true },
    { name: 'Unused', slug: 'unused', trending: false },
  ],
  authors: async () => [{ name: 'Sam', slug: 'sam', role: 'Reporter', bio: 'Bio.' }],
  articles: async () => articles,
}

const count = async (collection: 'articles' | 'media' | 'categories' | 'topics' | 'authors') =>
  (await payload.count({ collection })).totalDocs

beforeAll(async () => {
  jpeg = await sharp({ create: { width: 1600, height: 900, channels: 3, background: { r: 90, g: 120, b: 160 } } })
    .jpeg()
    .toBuffer()
  await useTestDatabase('sanity-migration')
  const { default: config } = await import('../src/payload.config')
  payload = await getPayload({ config })
})

afterAll(async () => {
  await payload?.destroy?.()
})

describe('migration from Sanity', () => {
  it('a dry run writes nothing but checks everything', async () => {
    const report = await migrateFromSanity({ payload, source, fetchImage })
    expect(await count('articles')).toBe(0)
    expect(await count('media')).toBe(0)
    expect(await count('categories')).toBe(0)

    const bySlug = Object.fromEntries(report.rows.map((r) => [`${r.kind}:${r.slug}`, r]))
    expect(bySlug['article:plain-story'].action).toBe('would create')
    expect(bySlug['article:plain-story'].problems).toEqual([])
    expect(bySlug['category:world'].action).toBe('would create')
    expect(report.mediaCreated).toBe(2) // "shared" once, "other" once
    expect(report.mediaReused).toBe(1) // "shared" is the plain hero and the rich inline picture
    expect(renderReport(report)).toContain('DRY RUN, nothing written')
  })

  it('reports an article without a category, and a lossy one, instead of hiding them', async () => {
    const report = await migrateFromSanity({ payload, source, fetchImage })
    const bySlug = Object.fromEntries(report.rows.map((r) => [r.slug, r]))

    expect(bySlug['no-category'].action).toBe('failed')
    expect(bySlug['no-category'].problems.join()).toContain('no category')
    // Conversion losses are explained notes (nothing silent), not text loss.
    expect(bySlug['lossy-story'].notes.join()).toContain('nested list item')
    expect(bySlug['lossy-story'].notes.join()).toContain('unsupported block type "table"')
    expect(bySlug['rich-story'].notes.join()).toContain('had no alt text')
    expect(reportFailed(report)).toBe(true) // the category-less article blocks cutover
  })

  it('apply writes everything and reads it back identical', async () => {
    const report = await migrateFromSanity({ payload, source, fetchImage, apply: true })
    const bySlug = Object.fromEntries(report.rows.map((r) => [r.slug, r]))

    expect(bySlug['plain-story'].action).toBe('created')
    expect(bySlug['plain-story'].problems).toEqual([])
    expect(bySlug['rich-story'].action).toBe('created')
    expect(bySlug['rich-story'].problems).toEqual([])
    expect(bySlug['no-category'].action).toBe('failed')

    expect(await count('articles')).toBe(3) // plain, rich, lossy; not the orphan
    expect(await count('categories')).toBe(1)
    expect(await count('topics')).toBe(2) // including the unreferenced one
    expect(await count('authors')).toBe(1)
    expect(await count('media')).toBe(2) // shared picture stored once

    const stored = (
      await payload.find({ collection: 'articles', where: { slug: { equals: 'plain-story' } }, depth: 1 })
    ).docs[0]
    expect(stored._status).toBe('published')
    expect(stored.featured).toBe(true)
    expect(stored.byline).toBe('Guest Writer')
    expect(new Date(stored.revisedAt as string).toISOString()).toBe('2026-08-02T09:00:00.000Z')
    expect(stored.corrections?.[0].note).toBe('Fixed a name.')
    const hero = stored.heroImage as { alt: string; focalX: number; focalY: number }
    expect(hero.alt).toBe('A boat')
    expect([hero.focalX, hero.focalY]).toEqual([25, 75])

    const rich = (await payload.find({ collection: 'articles', where: { slug: { equals: 'rich-story' } }, depth: 0 })).docs[0]
    const lexicalTypes = JSON.stringify(rich.body)
    for (const wanted of ['"type":"heading"', '"type":"link"', '"type":"list"', '"type":"quote"', '"type":"upload"']) {
      expect(lexicalTypes).toContain(wanted)
    }
  })

  it('anonymous readers see the migrated articles through the public API rules', async () => {
    const published = await payload.find({ collection: 'articles', overrideAccess: false, depth: 0 })
    expect(published.docs.map((d) => d.slug).sort()).toEqual(['lossy-story', 'plain-story', 'rich-story'])
  })

  it('a second run changes nothing and creates no duplicates', async () => {
    const report = await migrateFromSanity({ payload, source, fetchImage, apply: true })
    const created = report.rows.filter((r) => r.action === 'created')
    expect(created).toEqual([])
    expect(report.rows.filter((r) => r.slug === 'plain-story')[0].action).toBe('skipped (exists)')
    expect(await count('articles')).toBe(3)
    expect(await count('media')).toBe(2)
  })

  it('overwrite replaces existing items without duplicating them', async () => {
    const changed: MigrationSource = {
      ...source,
      articles: async () => [{ ...articles[0], headline: 'Plain story, revised' }],
    }
    const report = await migrateFromSanity({ payload, source: changed, fetchImage, apply: true, overwrite: true })
    expect(report.rows.find((r) => r.slug === 'plain-story')?.action).toBe('updated')
    expect(report.rows.find((r) => r.slug === 'plain-story')?.problems).toEqual([])
    const stored = (await payload.find({ collection: 'articles', where: { slug: { equals: 'plain-story' } } })).docs
    expect(stored).toHaveLength(1)
    expect(stored[0].headline).toBe('Plain story, revised')
    expect(await count('media')).toBe(2)
  })

  it('reports an image that cannot be downloaded or is too big, and an author portrait it cannot keep', async () => {
    const broken: MigrationSource = {
      categories: async () => [],
      topics: async () => [],
      authors: async () => [{ name: 'Pat', slug: 'pat', image: { asset: asset('portrait') } }],
      articles: async () => [{ ...articles[0], slug: 'broken-image', headline: 'Broken image' }],
    }
    const failing: ImageFetcher = async () => {
      throw new Error('download failed (404)')
    }
    const report = await migrateFromSanity({ payload, source: broken, fetchImage: failing })
    const byKind = Object.fromEntries(report.rows.map((r) => [r.kind, r]))
    expect(byKind.article.problems.join()).toContain('could not be downloaded')
    expect(byKind.author.problems.join()).toContain('no portrait field')

    const huge: ImageFetcher = async (a) => ({ data: Buffer.alloc(26 * 1024 * 1024), mimetype: 'image/jpeg', name: `${a._id}.jpg` })
    const bigReport = await migrateFromSanity({ payload, source: broken, fetchImage: huge })
    expect(bigReport.rows.find((r) => r.kind === 'article')?.problems.join()).toContain('over the 25 MB limit')
  })

  it('refuses an excerpt over the CMS limit instead of cutting it', async () => {
    const long: MigrationSource = {
      ...source,
      articles: async () => [{ ...articles[0], slug: 'long-excerpt', excerpt: 'x'.repeat(300) }],
    }
    const report = await migrateFromSanity({ payload, source: long, fetchImage })
    const row = report.rows.find((r) => r.slug === 'long-excerpt')
    expect(row?.action).toBe('failed')
    expect(row?.problems.join()).toContain('over the CMS limit of 280')
  })
})

describe('migration safety helpers', () => {
  it('describes the target without credentials', () => {
    expect(describeTarget('postgres://user:secret@db.internal:5432/cms')).toBe('postgres://db.internal:5432/cms')
    expect(describeTarget('postgresql://user:secret@db.internal/cms')).toBe('postgres://db.internal/cms')
    expect(describeTarget('file:./local.db')).toBe('file:./local.db')
    expect(describeTarget(undefined)).toBe('file:./cms-trial.db')
    expect(describeTarget('postgres://user:secret@db.internal:5432/cms')).not.toContain('secret')
  })

  it('allows a dry run always, and writing only with the typed target', () => {
    const url = 'postgres://u:p@db.internal:5432/cms'
    expect(applyGuard({ DATABASE_URL: url })).toBeNull()
    expect(applyGuard({ DATABASE_URL: url, MIGRATE_APPLY: '1' })).toContain('Refusing to write')
    expect(applyGuard({ DATABASE_URL: url, MIGRATE_APPLY: '1', MIGRATE_CONFIRM_TARGET: 'postgres://wrong/db' })).toContain(
      'Refusing to write',
    )
    expect(
      applyGuard({ DATABASE_URL: url, MIGRATE_APPLY: '1', MIGRATE_CONFIRM_TARGET: 'postgres://db.internal:5432/cms' }),
    ).toBeNull()
    // The refusal never prints the password.
    expect(applyGuard({ DATABASE_URL: url, MIGRATE_APPLY: '1' })).not.toContain(':p@')
  })

  it('downloads a cropped picture through the image service and converts unsupported types', () => {
    const base = asset('x')
    expect(imageDownloadUrl(base, null)).toEqual({ url: base.url, mimetype: 'image/jpeg' })
    const cropped = imageDownloadUrl(base, { top: 0.1, bottom: 0.1, left: 0.25, right: 0.25 })
    expect(cropped.url).toBe(`${base.url}?rect=400,90,800,720`)
    const heic = imageDownloadUrl({ ...base, mimeType: 'image/heic' }, null)
    expect(heic).toEqual({ url: `${base.url}?fm=jpg`, mimetype: 'image/jpeg' })
  })
})
