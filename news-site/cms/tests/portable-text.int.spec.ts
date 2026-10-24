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

/** Every construct the Sanity schema allows in an article body, plus edge cases. */
const fixture: PortableTextBlock[] = [
  { _type: 'block', _key: 'h', style: 'h2', children: [{ _type: 'span', text: 'A heading' }], markDefs: [] },
  {
    _type: 'block',
    _key: 'p',
    style: 'normal',
    markDefs: [{ _key: 'l1', _type: 'link', href: 'https://example.test/source' }],
    children: [
      { _type: 'span', text: 'Plain, ' },
      { _type: 'span', text: 'bold', marks: ['strong'] },
      { _type: 'span', text: ' and ' },
      { _type: 'span', text: 'bold italic', marks: ['strong', 'em'] },
      { _type: 'span', text: ' with a ' },
      { _type: 'span', text: 'link', marks: ['l1'] },
      { _type: 'span', text: '.' },
    ],
  },
  { _type: 'block', _key: 'q', style: 'blockquote', children: [{ _type: 'span', text: 'A quote' }], markDefs: [] },
  { _type: 'block', _key: 'b1', style: 'normal', listItem: 'bullet', level: 1, children: [{ _type: 'span', text: 'One' }] },
  { _type: 'block', _key: 'b2', style: 'normal', listItem: 'bullet', level: 1, children: [{ _type: 'span', text: 'Two' }] },
  { _type: 'block', _key: 'n1', style: 'normal', listItem: 'number', level: 1, children: [{ _type: 'span', text: 'First' }] },
  { _type: 'image', _key: 'img', asset: { _ref: 'image-abc-800x600-jpg' }, alt: 'A photo' },
]

describe('portableTextToLexical (structure)', () => {
  const { editorState, warnings } = portableTextToLexical(fixture)
  const children = editorState.root.children as Array<Record<string, unknown>>

  it('maps headings, paragraphs, quotes and lists in order', () => {
    expect(children.map((node) => node.type)).toEqual(['heading', 'paragraph', 'quote', 'list', 'list'])
    expect(children[0].tag).toBe('h2')
  })

  it('groups consecutive list items and splits bullet from number lists', () => {
    const [bullets, numbers] = children.slice(3) as Array<{ tag: string; children: unknown[] }>
    expect(bullets.tag).toBe('ul')
    expect(bullets.children).toHaveLength(2)
    expect(numbers.tag).toBe('ol')
    expect(numbers.children).toHaveLength(1)
  })

  it('keeps bold, italic and links', () => {
    const paragraph = children[1] as { children: Array<Record<string, any>> }
    const bold = paragraph.children.find((node) => node.text === 'bold')
    const boldItalic = paragraph.children.find((node) => node.text === 'bold italic')
    const link = paragraph.children.find((node) => node.type === 'link')
    expect(bold?.format).toBe(1)
    expect(boldItalic?.format).toBe(3)
    expect(link?.fields.url).toBe('https://example.test/source')
    expect(link?.children[0].text).toBe('link')
  })

  it('reports an image it cannot place instead of dropping it silently', () => {
    expect(warnings).toEqual([expect.stringContaining('image image-abc-800x600-jpg has no migrated media')])
  })

  it('places an image when the media id is known', () => {
    const result = portableTextToLexical(fixture, () => 42)
    const upload = (result.editorState.root.children as Array<Record<string, unknown>>).find(
      (node) => node.type === 'upload',
    )
    expect(upload).toMatchObject({ relationTo: 'media', value: 42 })
    expect(result.warnings).toEqual([])
  })

  it('reports unknown block types and marks', () => {
    const { warnings: unknown } = portableTextToLexical([
      { _type: 'video', _key: 'v' },
      { _type: 'block', _key: 'm', style: 'normal', children: [{ _type: 'span', text: 'x', marks: ['glow'] }] },
    ])
    expect(unknown).toHaveLength(2)
  })
})

describe('Payload accepts converted bodies', () => {
  let payload: Payload
  let categoryId: number

  beforeAll(async () => {
    await useTestDatabase('portable-text')
    const { default: config } = await import('../src/payload.config')
    payload = await getPayload({ config })
    categoryId = (await payload.create({ collection: 'categories', data: { name: 'News', slug: 'news' } })).id
  })

  afterAll(async () => {
    await payload?.destroy?.()
  })

  it('stores the converted body and its text survives the round trip', async () => {
    const { editorState } = portableTextToLexical(fixture)
    const article = await payload.create({
      collection: 'articles',
      data: {
        headline: 'Round trip',
        slug: 'round-trip',
        category: categoryId,
        body: editorState as never,
        _status: 'published',
      },
    })
    const stored = await payload.findByID({ collection: 'articles', id: article.id })
    const roundTrip = convertLexicalToPlaintext({ data: stored.body as never })
    expect(normaliseText(roundTrip)).toBe(normaliseText(portableTextToPlaintext(fixture)))
  })
})
