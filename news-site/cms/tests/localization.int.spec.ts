import { convertLexicalToPlaintext } from '@payloadcms/richtext-lexical/plaintext'
import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { asksToPublish } from '../src/access/roles'
import { slugify } from '../src/collections/slug'
import { portableTextToLexical, type PortableTextBlock } from '../src/migration/portableText'
import { useTestDatabase } from './helpers/testDatabase'

/**
 * Task 1.8a, the language-readiness spike (docs/localization-spike.md): what
 * the CMS does with several languages while only English is filled in.
 */
let payload: Payload
let categoryId: number

const body = (text: string) =>
  portableTextToLexical([
    {
      _type: 'block',
      _key: `k-${text}`,
      style: 'normal',
      markDefs: [],
      children: [{ _type: 'span', _key: `s-${text}`, text, marks: [] }],
    } as PortableTextBlock,
  ]).editorState as never

const plain = (value: unknown) => (value ? convertLexicalToPlaintext({ data: value as never }) : null)

beforeAll(async () => {
  await useTestDatabase('localization')
  const { default: config } = await import('../src/payload.config')
  payload = await getPayload({ config })
  categoryId = (await payload.create({ collection: 'categories', data: { name: 'World', slug: 'world' } })).id as number
})

afterAll(async () => {
  await payload?.destroy?.()
})

async function newArticle(slug: string, headline = 'English headline') {
  return payload.create({
    collection: 'articles',
    data: { headline, slug, category: categoryId, body: body('English body'), _status: 'published' },
    locale: 'en',
  })
}

describe('1.8a: an English-only article behaves as before (question 2)', () => {
  it('is created and read without naming a language', async () => {
    const created = await payload.create({
      collection: 'articles',
      data: { headline: 'Plain story', slug: 'plain-story', category: categoryId, _status: 'published' },
    })
    const read = await payload.findByID({ collection: 'articles', id: created.id })
    expect(read.headline).toBe('Plain story')
    expect(read.slug).toBe('plain-story')
  })

  it('anonymous readers see it through the access rules, with no language named', async () => {
    const found = await payload.find({ collection: 'articles', overrideAccess: false, where: { slug: { equals: 'plain-story' } } })
    expect(found.docs).toHaveLength(1)
  })
})

describe('1.8a: a language without text (questions 4 and 6)', () => {
  it('falls back to English by default, and can be told not to', async () => {
    const article = await newArticle('fallback-story', 'Fallback headline')
    const withFallback = await payload.findByID({ collection: 'articles', id: article.id, locale: 'es' as never })
    expect(withFallback.headline).toBe('Fallback headline') // English shown in the Spanish edition

    const withoutFallback = await payload.findByID({
      collection: 'articles',
      id: article.id,
      locale: 'es' as never,
      fallbackLocale: false as never,
    })
    expect(withoutFallback.headline).toBeFalsy() // so the website can tell "not translated"
    expect(plain(withoutFallback.body)).toBeFalsy()
  })

  it('stores a rich-text body per language and reads each back', async () => {
    const article = await newArticle('body-story', 'Body headline')
    await payload.update({
      collection: 'articles',
      id: article.id,
      locale: 'es' as never,
      data: { headline: 'Titular', body: body('Cuerpo en español') },
      draft: false,
    })
    const en = await payload.findByID({ collection: 'articles', id: article.id, locale: 'en' as never, fallbackLocale: false as never })
    const es = await payload.findByID({ collection: 'articles', id: article.id, locale: 'es' as never, fallbackLocale: false as never })
    expect(plain(en.body)).toContain('English body')
    expect(plain(es.body)).toContain('Cuerpo en español')
    expect(en.headline).toBe('Body headline')
    expect(es.headline).toBe('Titular')
  })

  it('Arabic text is stored and read back exactly, and the language is marked right-to-left', async () => {
    const article = await newArticle('arabic-story', 'Arabic headline')
    const arabic = 'عنوان الخبر: مثال على نص عربي'
    await payload.update({ collection: 'articles', id: article.id, locale: 'ar' as never, data: { headline: arabic } })
    const read = await payload.findByID({ collection: 'articles', id: article.id, locale: 'ar' as never, fallbackLocale: false as never })
    expect(read.headline).toBe(arabic)
    const localization = payload.config.localization
    const ar = localization ? localization.locales.find((l) => l.code === 'ar') : undefined
    expect(ar?.rtl).toBe(true)
  })
})

describe('1.8a: addresses (slugs) in several languages (question 5)', () => {
  it('Arabic and Chinese headlines cannot make a Latin-letter slug, which is why the slug is shared', () => {
    expect(slugify('عنوان الخبر')).toBe('')
    expect(slugify('量子计算的新突破')).toBe('')
    expect(slugify('Computación cuántica')).toBe('computacion-cuantica') // Spanish would have worked
  })

  it('every language of an article is read at the same slug', async () => {
    const article = await newArticle('quantum-computing')
    await payload.update({ collection: 'articles', id: article.id, locale: 'es' as never, data: { headline: 'Computación cuántica' } })
    const es = await payload.find({
      collection: 'articles',
      locale: 'es' as never,
      fallbackLocale: false as never,
      where: { slug: { equals: 'quantum-computing' } },
    })
    expect(es.docs.map((d) => d.id)).toEqual([article.id])
    expect(es.docs[0].headline).toBe('Computación cuántica')
  })

  it('still refuses a duplicate slug', async () => {
    await newArticle('dup-slug', 'First')
    await expect(newArticle('dup-slug', 'Second')).rejects.toThrow()
  })
})

describe('1.8a: publishing one language at a time (question 3)', () => {
  const publicRead = (id: number, locale: string, fallback = false) =>
    payload.findByID({
      collection: 'articles',
      id,
      locale: locale as never,
      fallbackLocale: (fallback ? undefined : false) as never,
      overrideAccess: false,
      depth: 0,
    })

  it('an unfinished Spanish draft stays private when English is published and republished', async () => {
    const article = await newArticle('publish-story', 'English v1')
    const id = article.id as number
    await payload.update({ collection: 'articles', id, locale: 'es' as never, draft: true, data: { headline: 'Borrador en español' } })
    await payload.update({ collection: 'articles', id, locale: 'en' as never, data: { headline: 'English v2', _status: 'published' } })

    expect((await publicRead(id, 'en')).headline).toBe('English v2')
    await expect(publicRead(id, 'es')).rejects.toThrow(/not found/i) // Spanish is not public
  })

  it('publishing Spanish makes only Spanish public, and unpublishing it leaves English up', async () => {
    const article = await newArticle('two-languages', 'English headline')
    const id = article.id as number

    await payload.update({ collection: 'articles', id, locale: 'es' as never, data: { headline: 'Titular', _status: 'published' } })
    expect((await publicRead(id, 'es')).headline).toBe('Titular')
    expect((await publicRead(id, 'en')).headline).toBe('English headline')

    await payload.update({ collection: 'articles', id, locale: 'es' as never, data: { _status: 'draft' } })
    await expect(publicRead(id, 'es')).rejects.toThrow(/not found/i)
    expect((await publicRead(id, 'en')).headline).toBe('English headline')
  })

  it('a language that is not published is not served even with the English fallback switched on', async () => {
    const article = await newArticle('no-fallback-leak', 'English headline')
    const result = await publicRead(article.id as number, 'es', true).then(
      (doc) => ({ served: true as const, headline: doc.headline }),
      () => ({ served: false as const, headline: null }),
    )
    // Recorded behaviour: the website decides what the Spanish edition shows for an
    // untranslated story (a notice, or a link to English); the CMS does not mix languages.
    expect(result.served ? result.headline : null).toBeNull()
  })
})

describe('1.8a: the writer rules still hold with a status per language (security)', () => {
  const asObject = (status: string) => ({ en: status }) as never

  async function writer() {
    return payload.create({
      collection: 'users',
      data: { email: `writer-${Date.now()}-${Math.random()}@example.test`, password: `pw-${Date.now()}-${Math.random()}`, role: 'writer' },
    })
  }

  it('a writer cannot create a published article by sending the status as a per-language object (end result; Payload also rejects this form)', async () => {
    const user = await writer()
    await expect(
      payload.create({
        collection: 'articles',
        data: { headline: 'Sneaky', slug: 'sneaky-create', category: categoryId, _status: asObject('published') },
        user,
        overrideAccess: false,
      }),
    ).rejects.toThrow()
    const found = await payload.find({ collection: 'articles', where: { slug: { equals: 'sneaky-create' } }, overrideAccess: true })
    expect(found.docs.filter((d) => JSON.stringify(d._status).includes('published'))).toHaveLength(0)
  })

  it('a writer cannot publish their own draft by sending the object form', async () => {
    const user = await writer()
    const draft = await payload.create({
      collection: 'articles',
      data: { headline: 'My draft', slug: 'sneaky-update', category: categoryId, _status: 'draft' },
      user,
      overrideAccess: false,
      draft: true,
    })
    await expect(
      payload.update({
        collection: 'articles',
        id: draft.id,
        data: { _status: asObject('published') },
        user,
        overrideAccess: false,
      }),
    ).rejects.toThrow()
    const stored = await payload.findByID({ collection: 'articles', id: draft.id, overrideAccess: true, draft: true })
    expect(JSON.stringify(stored._status)).not.toContain('published')
  })
})

describe('1.8a: recognising a request to publish (the writer rule, in both shapes)', () => {
  it('sees "published" as a word or inside a per-language object', () => {
    expect(asksToPublish('published')).toBe(true)
    expect(asksToPublish({ en: 'published' })).toBe(true)
    expect(asksToPublish({ en: 'draft', es: 'published' })).toBe(true)
  })

  it('does not mistake drafts or missing values for publishing', () => {
    expect(asksToPublish('draft')).toBe(false)
    expect(asksToPublish({ en: 'draft', es: 'draft' })).toBe(false)
    expect(asksToPublish({})).toBe(false)
    expect(asksToPublish(undefined)).toBe(false)
    expect(asksToPublish(null)).toBe(false)
    expect(asksToPublish(42)).toBe(false)
  })
})

describe('1.8a: limiting a translator to some languages is possible (question 9)', () => {
  it('an access rule can see which language a save is for, so it can refuse the others', async () => {
    const editor = await payload.create({
      collection: 'users',
      data: { email: `editor-${Date.now()}@example.test`, password: `pw-${Date.now()}-${Math.random()}`, role: 'editor' },
    })
    const article = await newArticle('locale-visible', 'English headline')
    const config = payload.collections['articles'].config
    const original = config.access.update
    const seen: string[] = []
    config.access.update = async (args) => {
      seen.push(String(args.req.locale))
      return original!(args)
    }
    try {
      await payload.update({
        collection: 'articles',
        id: article.id,
        locale: 'es' as never,
        data: { headline: 'Titular' },
        user: editor,
        overrideAccess: false,
      })
      await payload.update({
        collection: 'articles',
        id: article.id,
        locale: 'ar' as never,
        data: { headline: 'عنوان' },
        user: editor,
        overrideAccess: false,
      })
    } finally {
      config.access.update = original
    }
    expect(seen).toEqual(expect.arrayContaining(['es', 'ar']))
  })
})
