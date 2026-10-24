import type { CollectionAfterChangeHook, CollectionAfterDeleteHook, Payload } from 'payload'

/**
 * Tells the public website to refresh pages when published content changes
 * (plan task 1.10), so a publish shows up within seconds instead of waiting
 * out the 60 s revalidate window.
 *
 * Configured by two environment variable names (values only in each
 * environment, never in the repo): WEB_REVALIDATE_URL (the website's
 * /api/revalidate-cms address) and WEB_REVALIDATE_SECRET (must equal the
 * website's REVALIDATE_SECRET). If either is missing nothing is sent, which is
 * the normal state on a developer machine.
 *
 * A failed notification never fails the editor's save: it is logged, and the
 * site still refreshes on its own within 60 s.
 */
export type WebChange = { type: 'article' | 'category' | 'author' | 'topic'; slug?: string | null; categorySlug?: string | null }

/**
 * Wait a moment before calling: the hook runs inside the database transaction,
 * so an immediate call could make the site read the old content.
 */
const DEFAULT_DELAY_MS = 1500

export function sendToWeb(payload: Payload, change: WebChange) {
  const url = process.env.WEB_REVALIDATE_URL
  const secret = process.env.WEB_REVALIDATE_SECRET
  if (!url || !secret) return

  const delay = Number(process.env.WEB_REVALIDATE_DELAY_MS ?? DEFAULT_DELAY_MS)
  setTimeout(async () => {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-revalidate-secret': secret },
        body: JSON.stringify(change),
        signal: AbortSignal.timeout(5000),
      })
      if (!response.ok) {
        payload.logger.warn(`Website refresh for ${change.type} returned ${response.status}`)
      }
    } catch (error) {
      payload.logger.warn({ err: error }, `Website refresh for ${change.type} failed; the site will catch up on its own`)
    }
  }, delay).unref?.()
}

type Statusful = { _status?: string | null }

/**
 * An article change reaches readers when it publishes, or takes a published
 * article down. A draft save on a published article (autosave runs every two
 * seconds while an editor types) does not change the live page and must not
 * trigger a refresh.
 *
 * Payload hands the hook the same `doc` (draft) and `previousDoc` (published)
 * for both "autosave an edit to a live article" and "unpublish it". They
 * differ in the stored live copy: a draft save leaves it published, an
 * unpublish changes it to draft. `liveStatus` is that stored status.
 */
export function affectsLivePage(doc: Statusful, previousDoc: Statusful | undefined, liveStatus?: string | null) {
  if (doc._status === 'published') return true
  return previousDoc?._status === 'published' && liveStatus !== 'published'
}

async function categorySlugOf(payload: Payload, category: unknown): Promise<string | null> {
  if (!category) return null
  if (typeof category === 'object') return (category as { slug?: string }).slug ?? null
  const found = await payload
    .findByID({ collection: 'categories', id: category as number, depth: 0, overrideAccess: true })
    .catch(() => null)
  return found?.slug ?? null
}

export const notifyAfterArticleChange: CollectionAfterChangeHook = async ({ doc, previousDoc, req }) => {
  // Only look at the stored live copy when it matters (a draft over a live article).
  let liveStatus: string | null | undefined
  if (doc._status !== 'published' && previousDoc?._status === 'published') {
    // Pass req so the read sees this operation's own, not yet committed, write.
    const live = await req.payload
      .findByID({ collection: 'articles', id: doc.id, draft: false, depth: 0, overrideAccess: true, req })
      .catch(() => null)
    liveStatus = live?._status
  }
  if (!affectsLivePage(doc, previousDoc, liveStatus)) return doc
  const categorySlug = await categorySlugOf(req.payload, doc.category)
  sendToWeb(req.payload, { type: 'article', slug: doc.slug, categorySlug })
  return doc
}

export const notifyAfterArticleDelete: CollectionAfterDeleteHook = async ({ doc, req }) => {
  if (doc._status !== 'published') return doc
  const categorySlug = await categorySlugOf(req.payload, doc.category)
  sendToWeb(req.payload, { type: 'article', slug: doc.slug, categorySlug })
  return doc
}

/** Categories, topics and authors have no drafts: any change is live. */
export const notifyAfterTaxonomyChange = (type: 'category' | 'topic' | 'author'): CollectionAfterChangeHook =>
  ({ doc, req }) => {
    sendToWeb(req.payload, { type, slug: doc.slug })
    return doc
  }
