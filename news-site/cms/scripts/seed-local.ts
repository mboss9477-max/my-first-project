/**
 * LOCAL TESTING ONLY. Copies the live, public Sanity content into a throwaway
 * local SQLite CMS database so the website can be tried against the CMS
 * (CONTENT_SOURCE=cms). It only reads Sanity's public API and only writes to
 * the local database named by DATABASE_URL. It refuses to run against anything
 * that is not a local SQLite file, so it can never touch staging or production.
 *
 *   DATABASE_URL=file:./seed-local.db npm run payload -- run scripts/seed-local.ts
 * (SQLite creates its tables itself on first start; the migration files are for Postgres.)
 *
 * This is a test seed, not the migration (plan task 1.13): no per-article
 * report, no idempotence. Delete the .db file and the media folder to reset.
 */
import { getPayload } from 'payload'

import { portableTextToLexical, type PortableTextBlock } from '../src/migration/portableText'

if (!process.env.DATABASE_URL?.startsWith('file:')) {
  throw new Error('seed-local only runs against a local SQLite file (DATABASE_URL=file:...).')
}

const QUERY = `*[_type == "article" && defined(slug.current)]{
  headline, "slug": slug.current, excerpt, byline, publishedAt, featured,
  "category": category->{name, "slug": slug.current},
  "topics": topics[]->{name, "slug": slug.current, trending},
  "author": author->{name, "slug": slug.current, role, bio},
  "heroImage": heroImage{alt, caption, "url": asset->url},
  corrections[]{correctedAt, note},
  body[]{..., "url": asset->url}
}`
const SANITY_URL =
  'https://crji8h2y.apicdn.sanity.io/v2024-10-01/data/query/production?query=' +
  encodeURIComponent(QUERY)

type SanityArticle = {
  headline: string
  slug: string
  excerpt: string | null
  byline: string | null
  publishedAt: string | null
  featured: boolean | null
  category: { name: string; slug: string } | null
  topics: { name: string; slug: string; trending?: boolean }[] | null
  author: { name: string; slug: string; role?: string; bio?: string } | null
  heroImage: { alt?: string; caption?: string; url?: string } | null
  corrections: { correctedAt: string; note: string }[] | null
  body: (PortableTextBlock & { url?: string; alt?: string; caption?: string })[] | null
}

const { default: config } = await import('../src/payload.config')
const payload = await getPayload({ config })

const mediaByUrl = new Map<string, number>()
async function uploadImage(url: string, alt: string, caption?: string) {
  const known = mediaByUrl.get(url)
  if (known) return known
  const response = await fetch(`${url}?w=1600&fm=jpg`)
  const data = Buffer.from(await response.arrayBuffer())
  const media = await payload.create({
    collection: 'media',
    data: { alt: alt || 'Image', caption },
    file: {
      data,
      mimetype: 'image/jpeg',
      name: `${url.split('/').pop()?.split('.')[0] ?? 'image'}.jpg`,
      size: data.length,
    },
  })
  mediaByUrl.set(url, media.id)
  return media.id
}

async function ensure(collection: 'categories' | 'topics' | 'authors', data: Record<string, unknown>) {
  const found = await payload.find({
    collection,
    where: { slug: { equals: data.slug as string } },
    limit: 1,
    overrideAccess: true,
  })
  if (found.docs[0]) return found.docs[0].id
  return (await payload.create({ collection, data: data as never })).id
}

// Topics without articles still exist on the site, so copy them all.
const topicQuery = encodeURIComponent('*[_type == "topic" && defined(slug.current)]{name, "slug": slug.current, trending}')
const allTopics = ((await (await fetch(SANITY_URL.split('?')[0] + '?query=' + topicQuery)).json()) as {
  result: { name: string; slug: string; trending?: boolean }[]
}).result
for (const topic of allTopics) {
  await ensure('topics', { name: topic.name, slug: topic.slug, trending: topic.trending ?? false })
}

const articles = ((await (await fetch(SANITY_URL)).json()) as { result: SanityArticle[] }).result
console.log(`Seeding ${articles.length} articles from Sanity into ${process.env.DATABASE_URL}`)

for (const article of articles) {
  if (!article.category) continue
  const category = await ensure('categories', article.category)
  const topics: (number | string)[] = []
  for (const topic of article.topics ?? []) {
    topics.push(await ensure('topics', { name: topic.name, slug: topic.slug, trending: topic.trending ?? false }))
  }
  const author = article.author ? await ensure('authors', article.author) : undefined
  const heroImage = article.heroImage?.url
    ? await uploadImage(article.heroImage.url, article.heroImage.alt ?? article.headline, article.heroImage.caption)
    : undefined

  const imageIds = new Map<PortableTextBlock, number>()
  for (const block of article.body ?? []) {
    if (block._type === 'image' && block.url) {
      imageIds.set(block, await uploadImage(block.url, block.alt ?? '', block.caption))
    }
  }
  const { editorState } = portableTextToLexical(article.body, (block) => imageIds.get(block) ?? null)

  await payload.create({
    collection: 'articles',
    data: {
      headline: article.headline,
      slug: article.slug,
      excerpt: article.excerpt ?? undefined,
      byline: article.byline ?? undefined,
      author: author as never,
      publishedAt: article.publishedAt ?? undefined,
      category: category as never,
      topics: topics as never,
      featured: article.featured ?? false,
      heroImage: heroImage as never,
      body: editorState as never,
      corrections: article.corrections ?? [],
      _status: 'published',
    },
  })
  console.log(`  ${article.slug}`)
}

await payload.destroy?.()
console.log('Done.')
process.exit(0)
