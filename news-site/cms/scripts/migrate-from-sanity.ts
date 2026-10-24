/**
 * Sanity -> CMS migration (plan task 1.13). Reads Sanity's public API; writes to
 * the database named by DATABASE_URL only when told to, and only after the
 * target is confirmed by typing it. See src/migration/sanityMigration.ts.
 *
 * 1. Dry run (the default; writes nothing, needs the tables to exist):
 *      npm run payload -- run scripts/migrate-from-sanity.ts
 *    It prints the target it would write to and a report.
 * 2. Apply, once the dry-run report shows no problems:
 *      MIGRATE_APPLY=1 MIGRATE_CONFIRM_TARGET=<the target text printed above> \
 *        npm run payload -- run scripts/migrate-from-sanity.ts
 *    Re-running skips items that already exist; MIGRATE_OVERWRITE=1 replaces them.
 *
 * Writing to staging or production is an owner-approved step (AGENTS.md S5).
 * Optional: MIGRATE_REPORT_FILE=<path> also saves the report to a file.
 * Names only here; values live in the environment, never in the repo.
 */
import { writeFileSync } from 'node:fs'

import { getPayload } from 'payload'

import {
  applyGuard,
  describeTarget,
  fetchImageFromSanity,
  renderReport,
  reportFailed,
  migrateFromSanity,
  type MigrationSource,
  type SanityArticle,
  type SanityAuthor,
  type SanityNamed,
  type SanityTopic,
} from '../src/migration/sanityMigration'

const SANITY_QUERY_URL = 'https://crji8h2y.apicdn.sanity.io/v2024-10-01/data/query/production'

async function groq<T>(query: string): Promise<T> {
  const response = await fetch(`${SANITY_QUERY_URL}?query=${encodeURIComponent(query)}`, {
    signal: AbortSignal.timeout(60_000),
  })
  if (!response.ok) throw new Error(`Sanity query failed (${response.status})`)
  return ((await response.json()) as { result: T }).result
}

const ASSET = `asset->{_id, url, mimeType, size, "dimensions": metadata.dimensions{width, height}}`

const source: MigrationSource = {
  categories: () =>
    groq<SanityNamed[]>(`*[_type == "category" && defined(slug.current)] | order(name asc){name, "slug": slug.current}`),
  topics: () =>
    groq<SanityTopic[]>(`*[_type == "topic" && defined(slug.current)] | order(name asc){name, "slug": slug.current, trending}`),
  authors: () =>
    groq<SanityAuthor[]>(
      `*[_type == "author" && defined(slug.current)] | order(name asc){name, "slug": slug.current, role, bio, "image": image{alt, caption, hotspot, crop, ${ASSET}}}`,
    ),
  articles: () =>
    groq<SanityArticle[]>(`*[_type == "article" && defined(slug.current)] | order(publishedAt asc){
      headline, "slug": slug.current, excerpt, byline, publishedAt, updatedAt, featured,
      "category": category->{name, "slug": slug.current},
      "topics": topics[]->{name, "slug": slug.current},
      "author": author->{name, "slug": slug.current},
      "heroImage": heroImage{alt, caption, hotspot, crop, ${ASSET}},
      corrections[]{correctedAt, note},
      body[]{..., _type == "image" => {"assetInfo": ${ASSET}}}
    }`),
}

const target = describeTarget(process.env.DATABASE_URL)
const apply = process.env.MIGRATE_APPLY === '1'
console.log(`Target database: ${target}`)
console.log(apply ? 'Mode: APPLY (writes)' : 'Mode: dry run (writes nothing)')

const refusal = applyGuard(process.env)
if (refusal) {
  console.error(refusal)
  process.exit(2)
}

const { default: config } = await import('../src/payload.config')
const payload = await getPayload({ config })

const report = await migrateFromSanity({
  payload,
  source,
  fetchImage: fetchImageFromSanity,
  apply,
  overwrite: process.env.MIGRATE_OVERWRITE === '1',
})

const text = renderReport(report)
console.log('\n' + text)
if (process.env.MIGRATE_REPORT_FILE) writeFileSync(process.env.MIGRATE_REPORT_FILE, text + '\n')

await payload.destroy?.()
process.exit(reportFailed(report) ? 1 : 0)
