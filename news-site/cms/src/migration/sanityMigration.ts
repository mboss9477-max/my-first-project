/**
 * Copies the legacy Sanity content into the new CMS (plan task 1.13).
 *
 * Safe by construction:
 *  - It only READS Sanity (public API) and by default writes nothing: a dry run
 *    converts everything, checks it and reports what it would do.
 *  - Writing needs `apply: true`, and the command-line wrapper additionally
 *    demands a typed confirmation of the target database (see `applyGuard`).
 *  - Re-runnable: an item whose slug already exists is skipped unless
 *    `overwrite: true`, so a second run never duplicates or silently replaces
 *    an editor's work.
 *  - Nothing is dropped silently: every difference is either an explained note
 *    or a problem that makes the run fail.
 *
 * Only published Sanity content is read (the public dataset hides drafts).
 * The Sanity side and the image download are injected so tests use fakes.
 */
import { convertLexicalToPlaintext } from '@payloadcms/richtext-lexical/plaintext'
import type { Payload } from 'payload'

import { MAX_UPLOAD_BYTES } from '../collections/uploadRules'
import {
  normaliseText,
  portableTextToLexical,
  portableTextToPlaintext,
  type PortableTextBlock,
} from './portableText'

// ---- Sanity shapes (only what is read) ------------------------------------

export type SanityAsset = {
  _id: string
  url: string
  mimeType?: string | null
  size?: number | null
  dimensions?: { width: number; height: number } | null
}

export type SanityImage = {
  alt?: string | null
  caption?: string | null
  hotspot?: { x: number; y: number } | null
  crop?: { top: number; bottom: number; left: number; right: number } | null
  asset?: SanityAsset | null
}

export type SanityBodyBlock = PortableTextBlock & {
  alt?: string | null
  caption?: string | null
  hotspot?: SanityImage['hotspot']
  crop?: SanityImage['crop']
  assetInfo?: SanityAsset | null
}

export type SanityNamed = { name: string; slug: string }
export type SanityTopic = SanityNamed & { trending?: boolean | null }
export type SanityAuthor = SanityNamed & {
  role?: string | null
  bio?: string | null
  image?: SanityImage | null
}

export type SanityArticle = {
  headline: string
  slug: string
  excerpt?: string | null
  byline?: string | null
  publishedAt?: string | null
  updatedAt?: string | null
  featured?: boolean | null
  category?: SanityNamed | null
  topics?: SanityNamed[] | null
  author?: SanityNamed | null
  heroImage?: SanityImage | null
  corrections?: { correctedAt: string; note: string }[] | null
  body?: SanityBodyBlock[] | null
}

export type MigrationSource = {
  categories(): Promise<SanityNamed[]>
  topics(): Promise<SanityTopic[]>
  authors(): Promise<SanityAuthor[]>
  articles(): Promise<SanityArticle[]>
}

export type DownloadedImage = { data: Buffer; mimetype: string; name: string }
/** Fetches the image file for an asset (cropped if asked). Injected so tests can fake it. */
export type ImageFetcher = (asset: SanityAsset, crop: SanityImage['crop']) => Promise<DownloadedImage>

// ---- Report ---------------------------------------------------------------

export type Kind = 'category' | 'topic' | 'author' | 'article'
export type Action =
  | 'created'
  | 'updated'
  | 'skipped (exists)'
  | 'would create'
  | 'would update'
  | 'failed'

export type Row = {
  kind: Kind
  slug: string
  action: Action
  /** Differences that are explained and expected (for example, a missing alt text filled in). */
  notes: string[]
  /** Anything unexplained or blocking. Any problem fails the run. */
  problems: string[]
}

export type Report = {
  apply: boolean
  overwrite: boolean
  rows: Row[]
  mediaCreated: number
  mediaReused: number
}

export const reportFailed = (report: Report) => report.rows.some((row) => row.problems.length > 0)

export function renderReport(report: Report): string {
  const count = (kind: Kind) => report.rows.filter((row) => row.kind === kind).length
  const lines = [
    `# Migration report (${report.apply ? 'APPLIED' : 'DRY RUN, nothing written'}${report.overwrite ? ', overwrite on' : ''})`,
    '',
    `Items: ${count('category')} categories, ${count('topic')} topics, ${count('author')} authors, ${count('article')} articles.`,
    `Images: ${report.mediaCreated} ${report.apply ? 'uploaded' : 'checked'}, ${report.mediaReused} reused.`,
    '',
    '| Result | Kind | Slug | Action | Notes and problems |',
    '|---|---|---|---|---|',
  ]
  for (const row of report.rows) {
    const result = row.problems.length ? 'PROBLEM' : row.notes.length ? 'NOTE' : 'OK'
    const detail = [...row.problems.map((p) => `PROBLEM: ${p}`), ...row.notes].join('; ').replace(/\|/g, '/')
    lines.push(`| ${result} | ${row.kind} | ${row.slug} | ${row.action} | ${detail} |`)
  }
  const problems = report.rows.filter((row) => row.problems.length).length
  lines.push('', problems ? `**${problems} item(s) with problems. Do not cut over.**` : 'No problems.')
  return lines.join('\n')
}

// ---- Safety guard for the command-line wrapper -----------------------------

/** A label for the target database that is safe to print: no user name or password. */
export const UNREADABLE_TARGET = '(unreadable DATABASE_URL)'

export function describeTarget(databaseUrl: string | undefined): string {
  if (!databaseUrl) return 'file:./cms-trial.db'
  if (/^file:/i.test(databaseUrl)) return databaseUrl
  // Any other address: show scheme, host and database only. User name,
  // password and query (which can carry a token) are never printed.
  try {
    const url = new URL(databaseUrl)
    const scheme = /^postgres(ql)?:$/i.test(url.protocol) ? 'postgres:' : url.protocol
    return `${scheme}//${url.host}${url.pathname}`
  } catch {
    return UNREADABLE_TARGET
  }
}

/**
 * Writing is refused unless it was asked for and the person typed the target
 * label they were shown. Returns an error message, or null when allowed.
 */
export function applyGuard(env: Record<string, string | undefined>): string | null {
  if (env.MIGRATE_APPLY !== '1') return null // dry run is always allowed
  const target = describeTarget(env.DATABASE_URL)
  if (target === UNREADABLE_TARGET) {
    return 'Refusing to write: DATABASE_URL cannot be read, so the target cannot be confirmed. Fix it and run a dry run first.'
  }
  if (env.MIGRATE_CONFIRM_TARGET !== target) {
    return `Refusing to write. To write to ${target}, set MIGRATE_CONFIRM_TARGET to exactly that text. Run once without MIGRATE_APPLY to see the target and a dry-run report first.`
  }
  return null
}

// ---- Images ---------------------------------------------------------------

const ACCEPTED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif'])

/**
 * Where to download an asset from. A crop set in Sanity Studio is applied by
 * Sanity's own image service so the CMS gets the picture the site shows today;
 * a type the CMS does not accept (for example HEIC) is converted to JPEG.
 */
export function imageDownloadUrl(asset: SanityAsset, crop: SanityImage['crop']): { url: string; mimetype: string } {
  const params: string[] = []
  const size = asset.dimensions
  if (crop && size) {
    const left = Math.round(crop.left * size.width)
    const top = Math.round(crop.top * size.height)
    const width = Math.round(size.width * (1 - crop.left - crop.right))
    const height = Math.round(size.height * (1 - crop.top - crop.bottom))
    params.push(`rect=${left},${top},${width},${height}`)
  }
  let mimetype = asset.mimeType ?? 'image/jpeg'
  if (!ACCEPTED_TYPES.has(mimetype)) {
    params.push('fm=jpg')
    mimetype = 'image/jpeg'
  }
  return { url: params.length ? `${asset.url}?${params.join('&')}` : asset.url, mimetype }
}

/** Real image download for the command line. */
const SANITY_IMAGE_PREFIX = 'https://cdn.sanity.io/images/'

export const fetchImageFromSanity: ImageFetcher = async (asset, crop) => {
  // Only ever fetch from Sanity's own image host, whatever the data says.
  if (!asset.url.startsWith(SANITY_IMAGE_PREFIX)) {
    throw new Error(`refusing to download from outside ${SANITY_IMAGE_PREFIX}`)
  }
  const { url, mimetype } = imageDownloadUrl(asset, crop)
  const response = await fetch(url, { signal: AbortSignal.timeout(60_000) })
  if (!response.ok) throw new Error(`download failed (${response.status}) for ${url}`)
  const extension = mimetype === 'image/jpeg' ? 'jpg' : mimetype.split('/')[1]
  const suffix = crop ? '-cropped' : ''
  return {
    data: Buffer.from(await response.arrayBuffer()),
    mimetype,
    name: `${asset._id.replace(/^image-/, '').replace(/[^a-zA-Z0-9_-]/g, '-')}${suffix}.${extension}`,
  }
}

// ---- Migration ------------------------------------------------------------

export type MigrateOptions = {
  payload: Payload
  source: MigrationSource
  fetchImage: ImageFetcher
  /** Write to the database. False (default) is a dry run. */
  apply?: boolean
  /** Replace items that already exist (by slug). Default: skip them. */
  overwrite?: boolean
}

type Id = number | string

export async function migrateFromSanity(options: MigrateOptions): Promise<Report> {
  const { payload, source, fetchImage, apply = false, overwrite = false } = options
  const report: Report = { apply, overwrite, rows: [], mediaCreated: 0, mediaReused: 0 }

  // The CMS tells the website to refresh on every publish; thirteen hundred
  // refreshes during a bulk load help nobody. Switched off for this process.
  delete process.env.WEB_REVALIDATE_URL
  delete process.env.WEB_REVALIDATE_SECRET

  const row = (kind: Kind, slug: string): Row => {
    const created: Row = { kind, slug, action: 'would create', notes: [], problems: [] }
    report.rows.push(created)
    return created
  }

  const findBySlug = async (collection: 'categories' | 'topics' | 'authors' | 'articles', slug: string) => {
    const found = await payload.find({
      collection,
      where: { slug: { equals: slug } },
      limit: 1,
      depth: 0,
      pagination: false,
    })
    return found.docs[0] as { id: Id } | undefined
  }

  /** Create, update or skip one taxonomy or author record; returns its id (or null in a dry run). */
  async function upsert(
    kind: Exclude<Kind, 'article'>,
    collection: 'categories' | 'topics' | 'authors',
    slug: string,
    data: Record<string, unknown>,
    out: Row,
  ): Promise<Id | null> {
    const existing = await findBySlug(collection, slug)
    if (existing && !overwrite) {
      out.action = 'skipped (exists)'
      return existing.id
    }
    if (!apply) {
      out.action = existing ? 'would update' : 'would create'
      return existing?.id ?? null
    }
    try {
      if (existing) {
        await payload.update({ collection, id: existing.id, data: data as never })
        out.action = 'updated'
        return existing.id
      }
      const created = await payload.create({ collection, data: data as never })
      out.action = 'created'
      return created.id
    } catch (error) {
      out.action = 'failed'
      out.problems.push(`${kind} could not be saved: ${(error as Error).message}`)
      return null
    }
  }

  const ids = {
    categories: new Map<string, Id | null>(),
    topics: new Map<string, Id | null>(),
    authors: new Map<string, Id | null>(),
  }

  for (const category of await source.categories()) {
    const out = row('category', category.slug)
    ids.categories.set(category.slug, await upsert('category', 'categories', category.slug, { name: category.name, slug: category.slug }, out))
  }
  for (const topic of await source.topics()) {
    const out = row('topic', topic.slug)
    ids.topics.set(
      topic.slug,
      await upsert('topic', 'topics', topic.slug, { name: topic.name, slug: topic.slug, trending: topic.trending ?? false }, out),
    )
  }
  for (const author of await source.authors()) {
    const out = row('author', author.slug)
    if (author.image?.asset) {
      out.problems.push('author has a portrait, but the CMS authors collection has no portrait field yet; it was not migrated')
    }
    ids.authors.set(
      author.slug,
      await upsert(
        'author',
        'authors',
        author.slug,
        { name: author.name, slug: author.slug, role: author.role ?? undefined, bio: author.bio ?? undefined },
        out,
      ),
    )
  }

  // Images are stored once per picture (and crop): keyed by the download name.
  const mediaIds = new Map<string, Id>()
  const checkedInDryRun = new Set<string>()

  async function storeImage(
    asset: SanityAsset | null | undefined,
    image: Pick<SanityImage, 'alt' | 'caption' | 'hotspot' | 'crop'>,
    fallbackAlt: string,
    out: Row,
  ): Promise<Id | null> {
    if (!asset) return null
    let file: DownloadedImage
    try {
      file = await fetchImage(asset, image.crop)
    } catch (error) {
      out.problems.push(`image ${asset._id} could not be downloaded: ${(error as Error).message}`)
      return null
    }
    if (file.data.length > MAX_UPLOAD_BYTES) {
      out.problems.push(`image ${file.name} is ${(file.data.length / 1048576).toFixed(1)} MB, over the 25 MB limit`)
      return null
    }
    if (!ACCEPTED_TYPES.has(file.mimetype)) {
      out.problems.push(`image ${file.name} has type ${file.mimetype}, which the CMS does not accept`)
      return null
    }
    if (image.crop) out.notes.push(`image ${asset._id} had a crop; the cropped picture was stored`)

    const alt = image.alt?.trim()
    if (!alt) out.notes.push(`image ${asset._id} had no alt text; the headline was used, an editor should write a real description`)

    if (!apply) {
      if (checkedInDryRun.has(file.name)) report.mediaReused++
      else {
        checkedInDryRun.add(file.name)
        report.mediaCreated++
      }
      return -1
    }

    const known = mediaIds.get(file.name)
    if (known !== undefined) {
      report.mediaReused++
      return known
    }
    // Payload renames a file when its name is already on disk ("name-2.jpg"),
    // so look for the name with an optional counter, not the exact name.
    const dot = file.name.lastIndexOf('.')
    const base = file.name.slice(0, dot)
    const sameFile = new RegExp(`^${base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(-\\d+)?${file.name.slice(dot).replace('.', '\\.')}$`)
    const candidates = await payload.find({
      collection: 'media',
      where: { filename: { like: base } },
      limit: 50,
      depth: 0,
      pagination: false,
    })
    const existing = candidates.docs.find((doc) => sameFile.test(doc.filename ?? ''))
    if (existing) {
      mediaIds.set(file.name, existing.id)
      report.mediaReused++
      return existing.id
    }
    try {
      const created = await payload.create({
        collection: 'media',
        data: {
          alt: alt || fallbackAlt,
          caption: image.caption ?? undefined,
          focalX: image.hotspot ? Math.round(image.hotspot.x * 100) : undefined,
          focalY: image.hotspot ? Math.round(image.hotspot.y * 100) : undefined,
        },
        file: { data: file.data, mimetype: file.mimetype, name: file.name, size: file.data.length },
      })
      mediaIds.set(file.name, created.id)
      report.mediaCreated++
      return created.id
    } catch (error) {
      out.problems.push(`image ${file.name} could not be stored: ${(error as Error).message}`)
      return null
    }
  }

  for (const article of await source.articles()) {
    const out = row('article', article.slug)

    // ---- Checks that need no database ----
    if (!article.category) {
      out.action = 'failed'
      out.problems.push('article has no category (required by the CMS); not migrated')
      continue
    }
    if (article.excerpt && article.excerpt.length > 280) {
      out.action = 'failed'
      out.problems.push(`excerpt is ${article.excerpt.length} characters, over the CMS limit of 280; shorten it in Sanity (nothing was cut automatically)`)
      continue
    }

    const existing = await findBySlug('articles', article.slug)
    if (existing && !overwrite) {
      out.action = 'skipped (exists)'
      continue
    }

    // ---- Images ----
    const hero = article.heroImage
    const heroId = hero?.asset ? await storeImage(hero.asset, hero, article.headline, out) : null

    const bodyImageIds = new Map<PortableTextBlock, Id | null>()
    for (const block of article.body ?? []) {
      if (block._type === 'image' && block.assetInfo) {
        bodyImageIds.set(block, await storeImage(block.assetInfo, block, article.headline, out))
      }
    }

    // ---- Body ----
    const { editorState, warnings } = portableTextToLexical(article.body, (block) => {
      const id = bodyImageIds.get(block)
      return id === undefined ? null : id
    })
    // Conversion warnings are known, explained losses (for example a nested list
    // flattened). They are shown, never hidden.
    out.notes.push(...warnings)

    const before = normaliseText(portableTextToPlaintext(article.body))
    const afterConversion = normaliseText(convertLexicalToPlaintext({ data: editorState as never }))
    if (before !== afterConversion) {
      out.problems.push(`article text changed in conversion (${before.length} -> ${afterConversion.length} characters)`)
    }

    if (!apply) {
      out.action = existing ? 'would update' : 'would create'
      continue
    }
    if (out.problems.length) {
      out.action = 'failed'
      continue
    }

    // ---- Write, then read back and compare ----
    const categoryId = ids.categories.get(article.category.slug) ?? (await findBySlug('categories', article.category.slug))?.id
    if (categoryId === undefined || categoryId === null) {
      out.action = 'failed'
      out.problems.push(`category "${article.category.slug}" does not exist in the CMS`)
      continue
    }
    const topicIds: Id[] = []
    for (const topic of article.topics ?? []) {
      const id = ids.topics.get(topic.slug) ?? (await findBySlug('topics', topic.slug))?.id
      if (id === undefined || id === null) out.problems.push(`topic "${topic.slug}" does not exist in the CMS`)
      else topicIds.push(id)
    }
    let authorId: Id | undefined
    if (article.author) {
      const id = ids.authors.get(article.author.slug) ?? (await findBySlug('authors', article.author.slug))?.id
      if (id === undefined || id === null) out.problems.push(`author "${article.author.slug}" does not exist in the CMS`)
      else authorId = id
    }
    if (out.problems.length) {
      out.action = 'failed'
      continue
    }

    const data = {
      headline: article.headline,
      slug: article.slug,
      excerpt: article.excerpt ?? undefined,
      byline: article.byline ?? undefined,
      author: authorId,
      publishedAt: article.publishedAt ?? undefined,
      revisedAt: article.updatedAt ?? undefined,
      category: categoryId,
      topics: topicIds,
      featured: article.featured ?? false,
      heroImage: heroId ?? undefined,
      body: editorState,
      corrections: (article.corrections ?? []).map(({ correctedAt, note }) => ({ correctedAt, note })),
      _status: 'published' as const,
    }

    let savedId: Id
    try {
      if (existing) {
        await payload.update({ collection: 'articles', id: existing.id, data: data as never })
        savedId = existing.id
        out.action = 'updated'
      } else {
        savedId = (await payload.create({ collection: 'articles', data: data as never })).id
        out.action = 'created'
      }
    } catch (error) {
      out.action = 'failed'
      out.problems.push(`article could not be saved: ${(error as Error).message}`)
      continue
    }

    const stored = (await payload.findByID({ collection: 'articles', id: savedId, depth: 0 })) as unknown as Record<string, unknown>
    const differences: string[] = []
    const same = (label: string, a: unknown, b: unknown) => {
      if (JSON.stringify(a ?? null) !== JSON.stringify(b ?? null)) differences.push(label)
    }
    const when = (value: unknown) => (value ? new Date(String(value)).toISOString() : null)
    same('headline', stored.headline, article.headline)
    same('slug', stored.slug, article.slug)
    same('excerpt', stored.excerpt, article.excerpt)
    same('byline', stored.byline, article.byline)
    same('publishedAt', when(stored.publishedAt), when(article.publishedAt))
    same('revisedAt', when(stored.revisedAt), when(article.updatedAt))
    same('category', stored.category, categoryId)
    same('author', stored.author, authorId)
    same('topics', [...((stored.topics as Id[]) ?? [])].sort(), [...topicIds].sort())
    same('featured', stored.featured, article.featured ?? false)
    same('hero image', stored.heroImage, heroId)
    same('status', stored._status, 'published')
    same(
      'corrections',
      ((stored.corrections as { correctedAt: string; note: string }[]) ?? []).map((c) => [when(c.correctedAt), c.note]),
      (article.corrections ?? []).map((c) => [when(c.correctedAt), c.note]),
    )
    const storedText = normaliseText(convertLexicalToPlaintext({ data: stored.body as never }))
    if (storedText !== before) differences.push(`body text (${before.length} -> ${storedText.length} characters)`)
    const storedImages = JSON.stringify(stored.body ?? {}).split('"type":"upload"').length - 1
    const wantedImages = (article.body ?? []).filter((block) => block._type === 'image' && bodyImageIds.get(block) != null).length
    if (storedImages !== wantedImages) differences.push(`body images (${wantedImages} -> ${storedImages})`)
    if (differences.length) {
      out.problems.push(`after saving, these differ from Sanity: ${differences.join(', ')}`)
    }
  }

  return report
}
