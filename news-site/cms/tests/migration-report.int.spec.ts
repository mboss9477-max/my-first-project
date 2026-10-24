import { convertLexicalToPlaintext } from '@payloadcms/richtext-lexical/plaintext'
import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { useTestDatabase } from './helpers/testDatabase'

import {
  normaliseText,
  portableTextToLexical,
  portableTextToPlaintext,
  type PortableTextBlock,
} from '../src/migration/portableText'

/**
 * Dry run against the LIVE Sanity content (read-only public API), into a
 * throwaway SQLite file. Opt-in because it needs the network:
 *   MIGRATION_REPORT=1 npm test -- migration-report
 */
const enabled = process.env.MIGRATION_REPORT === '1'

const SANITY_QUERY =
  'https://crji8h2y.apicdn.sanity.io/v2024-10-01/data/query/production?query=' +
  encodeURIComponent('*[_type == "article"]{_id, headline, "slug": slug.current, body}')

type SanityArticle = { _id: string; headline: string; slug: string; body: PortableTextBlock[] | null }

describe.skipIf(!enabled)('migration dry run: live Sanity articles', () => {
  let payload: Payload
  let articles: SanityArticle[]
  let categoryId: number

  beforeAll(async () => {
    await useTestDatabase('migration')
    const { default: config } = await import('../src/payload.config')
    payload = await getPayload({ config })
    categoryId = (await payload.create({ collection: 'categories', data: { name: 'Migrated', slug: 'migrated' } })).id

    const response = await fetch(SANITY_QUERY)
    articles = ((await response.json()) as { result: SanityArticle[] }).result
  })

  afterAll(async () => {
    await payload?.destroy?.()
  })

  it('converts, stores and reads back every article without text loss', async () => {
    const rows: string[] = []
    let failures = 0

    for (const article of articles) {
      const { editorState, warnings } = portableTextToLexical(article.body)
      const created = await payload.create({
        collection: 'articles',
        data: {
          headline: article.headline,
          slug: article.slug,
          category: categoryId,
          body: editorState as never,
          _status: 'published',
        },
      })
      const stored = await payload.findByID({ collection: 'articles', id: created.id })
      const before = normaliseText(portableTextToPlaintext(article.body))
      const after = normaliseText(convertLexicalToPlaintext({ data: stored.body as never }))
      const ok = before === after && warnings.length === 0
      if (!ok) failures++
      rows.push(
        `${ok ? 'OK  ' : 'DIFF'} ${article.slug} | blocks ${article.body?.length ?? 0} | chars ${before.length} -> ${after.length} | warnings ${warnings.length}${warnings.length ? ': ' + warnings.join('; ') : ''}`,
      )
    }

    console.log(`\nMIGRATION REPORT (${articles.length} articles)\n` + rows.join('\n'))
    expect(articles.length).toBeGreaterThan(0)
    expect(failures).toBe(0)
  })
})
