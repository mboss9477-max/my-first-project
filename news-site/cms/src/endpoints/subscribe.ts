import { timingSafeEqual } from 'node:crypto'

import type { PayloadHandler } from 'payload'

/**
 * The one narrow door through which the public website adds a newsletter
 * subscriber (runbook gap G-1). The collection itself stays admin-only: nobody
 * can read, list or write it through the normal API. This endpoint can only
 * ever do one thing, add an email address, and only for a caller that presents
 * the shared secret.
 *
 * - The secret lives in SUBSCRIBE_SECRET here and CMS_SUBSCRIBE_SECRET on the
 *   website (names only; values live in each environment, never in the repo).
 *   With no secret configured every request is refused (fail closed).
 * - The answer is the same whether the address was new or already on the list,
 *   so the endpoint cannot be used to find out who is subscribed.
 * - Addresses are lower-cased, so "A@x.com" and "a@x.com" are one subscriber.
 * - A backstop caps how many requests are served per window, so a flood that
 *   gets past the website's own per-visitor limit cannot fill the database.
 * - Nothing here logs an address.
 */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MAX_EMAIL_LENGTH = 254
const MAX_BODY_BYTES = 1_000

const WINDOW_MS = 10 * 60 * 1000
const MAX_REQUESTS_PER_WINDOW = 100

let recent: number[] = []

/** For tests: forget the requests counted so far. */
export function resetSubscribeLimit() {
  recent = []
}

function overLimit(now: number) {
  recent = recent.filter((time) => now - time < WINDOW_MS)
  if (recent.length >= MAX_REQUESTS_PER_WINDOW) return true
  recent.push(now)
  return false
}

function secretMatches(provided: string | null, expected: string) {
  if (!provided) return false
  const a = Buffer.from(provided)
  const b = Buffer.from(expected)
  // Constant-time comparison; lengths must match first or timingSafeEqual throws.
  return a.length === b.length && timingSafeEqual(a, b)
}

const reply = (body: Record<string, unknown>, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  })

export const subscribeHandler: PayloadHandler = async (req) => {
  const secret = process.env.SUBSCRIBE_SECRET
  if (!secret) return reply({ ok: false, error: 'not configured' }, 503)
  if (!secretMatches(req.headers.get('x-subscribe-secret'), secret)) {
    return reply({ ok: false, error: 'unauthorised' }, 401)
  }

  const raw = typeof req.text === 'function' ? await req.text() : ''
  if (raw.length > MAX_BODY_BYTES) return reply({ ok: false, error: 'body too large' }, 413)

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return reply({ ok: false, error: 'body must be JSON' }, 400)
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return reply({ ok: false, error: 'body must be a JSON object' }, 400)
  }

  const value = (parsed as { email?: unknown }).email
  const email = typeof value === 'string' ? value.trim().toLowerCase() : ''
  if (!email || email.length > MAX_EMAIL_LENGTH || !EMAIL_PATTERN.test(email)) {
    return reply({ ok: false, error: 'invalid email' }, 400)
  }

  if (overLimit(Date.now())) {
    req.payload.logger.warn('Newsletter signup limit reached; refusing for now')
    return reply({ ok: false, error: 'too many requests' }, 429)
  }

  const exists = async () =>
    (
      await req.payload.find({
        collection: 'newsletter-subscribers',
        where: { email: { equals: email } },
        limit: 1,
        depth: 0,
        overrideAccess: true,
      })
    ).totalDocs > 0

  if (await exists()) return reply({ ok: true }, 200)

  try {
    await req.payload.create({
      collection: 'newsletter-subscribers',
      data: { email, subscribedAt: new Date().toISOString() },
      overrideAccess: true,
    })
  } catch {
    // Two requests for the same address can race; the loser hits the unique
    // index. That is still success. The error text is never logged because a
    // database message can contain the address.
    if (await exists()) return reply({ ok: true }, 200)
    req.payload.logger.error('Newsletter signup could not be saved')
    return reply({ ok: false, error: 'could not save' }, 500)
  }

  return reply({ ok: true }, 200)
}
