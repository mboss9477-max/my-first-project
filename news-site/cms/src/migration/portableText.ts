/**
 * Converts Sanity Portable Text (the current article body format) into the
 * Lexical JSON that Payload's rich-text field stores.
 *
 * Node shapes mirror Payload's own Slate-to-Lexical converters in
 * `@payloadcms/richtext-lexical` (paragraph, heading, quote, list, listitem,
 * link, upload, text) so the editor accepts the result unchanged.
 *
 * Anything the converter cannot map is reported in `warnings` instead of
 * being dropped silently; the migration report treats any warning as a
 * difference that needs a human look.
 */

export type PortableTextSpan = {
  _type: 'span'
  _key?: string
  text: string
  marks?: string[]
}

export type PortableTextMarkDef = { _key: string; _type: string; href?: string }

export type PortableTextBlock = {
  _type: string
  _key?: string
  style?: string
  listItem?: 'bullet' | 'number' | string
  level?: number
  children?: PortableTextSpan[]
  markDefs?: PortableTextMarkDef[]
  // Image blocks
  asset?: { _ref?: string }
  alt?: string
  caption?: string
}

/** Resolves a Sanity image block to an already-migrated media id, or null. */
export type ImageResolver = (block: PortableTextBlock) => number | string | null

type LexicalNode = Record<string, unknown>

export type ConversionResult = {
  /** Lexical serialized editor state, `{ root: { ... } }`, ready for a richText field. */
  editorState: { root: LexicalNode }
  warnings: string[]
}

// Lexical text format bit flags (same values Payload's NodeFormat uses).
const FORMAT = {
  strong: 1,
  em: 2,
  'strike-through': 4,
  underline: 8,
  code: 16,
} as const

const HEADING_STYLES = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6'])

const base = { direction: 'ltr', format: '', indent: 0 }

function textNode(text: string, format: number): LexicalNode {
  return { type: 'text', detail: 0, format, mode: 'normal', style: '', text, version: 1 }
}

function convertSpans(block: PortableTextBlock, warnings: string[]): LexicalNode[] {
  const markDefs = new Map((block.markDefs ?? []).map((def) => [def._key, def]))
  const nodes: LexicalNode[] = []

  for (const span of block.children ?? []) {
    if (span._type !== 'span') {
      warnings.push(`unsupported inline type "${span._type}" in block ${block._key ?? '?'}`)
      continue
    }
    let format = 0
    let link: PortableTextMarkDef | undefined
    for (const mark of span.marks ?? []) {
      if (mark in FORMAT) {
        format |= FORMAT[mark as keyof typeof FORMAT]
      } else if (markDefs.has(mark)) {
        const def = markDefs.get(mark)!
        if (def._type === 'link' && def.href) link = def
        else warnings.push(`unsupported annotation "${def._type}" in block ${block._key ?? '?'}`)
      } else {
        warnings.push(`unknown mark "${mark}" in block ${block._key ?? '?'}`)
      }
    }

    const text = textNode(span.text, format)
    if (link) {
      nodes.push({
        ...base,
        type: 'link',
        children: [text],
        fields: { linkType: 'custom', newTab: false, url: link.href, doc: null },
        version: 2,
      })
    } else {
      nodes.push(text)
    }
  }
  return nodes
}

function convertTextBlock(block: PortableTextBlock, warnings: string[]): LexicalNode {
  const children = convertSpans(block, warnings)
  const style = block.style ?? 'normal'

  if (HEADING_STYLES.has(style)) {
    return { ...base, type: 'heading', tag: style, children, version: 1 }
  }
  if (style === 'blockquote') {
    return { ...base, type: 'quote', children, version: 1 }
  }
  if (style !== 'normal') {
    warnings.push(`unknown style "${style}" in block ${block._key ?? '?'}; kept as paragraph`)
  }
  return { ...base, type: 'paragraph', textFormat: 0, children, version: 1 }
}

export function portableTextToLexical(
  blocks: PortableTextBlock[] | null | undefined,
  resolveImage: ImageResolver = () => null,
): ConversionResult {
  const warnings: string[] = []
  const children: LexicalNode[] = []
  type ListNode = LexicalNode & { children: LexicalNode[] }
  let openList: { listType: string; node: ListNode } | null = null

  for (const block of blocks ?? []) {
    if (block._type === 'block' && block.listItem) {
      const listType = block.listItem === 'number' ? 'number' : 'bullet'
      if (block.listItem !== 'bullet' && block.listItem !== 'number') {
        warnings.push(`unknown list type "${block.listItem}"; converted to bullet`)
      }
      if ((block.level ?? 1) > 1) {
        warnings.push(`nested list item (level ${block.level}) flattened in block ${block._key ?? '?'}`)
      }
      if (!openList || openList.listType !== listType) {
        const node: ListNode = {
          ...base,
          type: 'list',
          listType,
          start: 1,
          tag: listType === 'number' ? 'ol' : 'ul',
          children: [] as LexicalNode[],
          version: 1,
        }
        openList = { listType, node }
        children.push(node)
      }
      openList.node.children.push({
        ...base,
        type: 'listitem',
        value: openList.node.children.length + 1,
        children: convertSpans(block, warnings),
        version: 1,
      })
      continue
    }
    openList = null

    if (block._type === 'block') {
      children.push(convertTextBlock(block, warnings))
    } else if (block._type === 'image') {
      const id = resolveImage(block)
      if (id === null) {
        warnings.push(`image ${block.asset?._ref ?? '?'} has no migrated media; left out`)
        continue
      }
      children.push({ type: 'upload', format: '', relationTo: 'media', value: id, fields: {}, version: 2 })
    } else {
      warnings.push(`unsupported block type "${block._type}"; left out`)
    }
  }

  return {
    editorState: { root: { ...base, type: 'root', children, version: 1 } },
    warnings,
  }
}

/** Plain text of a Portable Text body, one line per block, for diffing. */
export function portableTextToPlaintext(blocks: PortableTextBlock[] | null | undefined): string {
  return (blocks ?? [])
    .filter((block) => block._type === 'block')
    .map((block) => (block.children ?? []).map((span) => span.text ?? '').join(''))
    .join('\n')
}

/**
 * Content fingerprint for diffing: all whitespace removed. Payload's plaintext
 * export separates some block types (e.g. quotes) without any whitespace, so
 * comparing with spaces would report false differences; removing whitespace
 * still catches any lost, added or changed character.
 */
export const normaliseText = (text: string) => text.replace(/\s+/g, '')
