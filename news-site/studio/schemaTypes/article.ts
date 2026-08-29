import {defineArrayMember, defineField, defineType} from 'sanity'

/**
 * Alt text is required once an image has actually been uploaded, but an empty
 * image field stays valid — otherwise an article with no hero could never be
 * published.
 */
const altTextRequiredWhenImageSet = (rule: {custom: Function}) =>
  rule.custom((alt: string | undefined, context: {parent?: {asset?: unknown}}) => {
    if (context.parent?.asset && !alt) {
      return 'Alternative text is required when an image is set'
    }
    return true
  })

/**
 * Warns when a reference points at a document that is still a draft. Sanity
 * allows publishing an article that references an unpublished document; the
 * reference then dangles, resolving in the Studio (which reads drafts) but not
 * on the public API, so the value silently vanishes from the live site.
 *
 * A draft lives at `drafts.<id>`, so querying the bare id matches only a
 * published document.
 */
const warnIfReferenceUnpublished = (label: string) => (rule: {custom: Function}) =>
  rule
    .custom(async (value: unknown, context: {getClient: Function}) => {
      const ref = (value as {_ref?: string} | undefined)?._ref
      if (!ref) return true

      const publishedId = ref.replace(/^drafts\./, '')
      const client = context.getClient({apiVersion: '2024-10-01'})
      const isPublished = await client.fetch('defined(*[_id == $id][0]._id)', {
        id: publishedId,
      })

      return isPublished
        ? true
        : `This ${label} has not been published yet. Publish it too, or it will not appear on the live site.`
    })
    .warning()

export const article = defineType({
  name: 'article',
  title: 'Article',
  type: 'document',
  groups: [
    {name: 'content', title: 'Content', default: true},
    {name: 'meta', title: 'Metadata'},
  ],
  fields: [
    defineField({
      name: 'headline',
      title: 'Headline',
      type: 'string',
      group: 'content',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      group: 'content',
      options: {source: 'headline', maxLength: 96},
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'excerpt',
      title: 'Excerpt',
      description:
        'One or two sentences summarising the story. Shown on cards and used as the search-result and social-share description.',
      type: 'text',
      rows: 3,
      group: 'content',
      validation: (rule) =>
        rule.max(280).warning('Keep under 280 characters so it is not truncated in search results.'),
    }),
    defineField({
      name: 'author',
      title: 'Author',
      description: 'Links the story to an author page. Leave empty and use the byline override for guest writers.',
      type: 'reference',
      to: [{type: 'author'}],
      group: 'content',
      validation: warnIfReferenceUnpublished('author'),
    }),
    defineField({
      name: 'byline',
      title: 'Byline override',
      description: 'Used only when no author document is set — e.g. "CS News Staff" or a guest contributor.',
      type: 'string',
      group: 'content',
    }),
    defineField({
      name: 'publishedAt',
      title: 'Published at',
      type: 'datetime',
      group: 'meta',
      initialValue: () => new Date().toISOString(),
    }),
    defineField({
      name: 'updatedAt',
      title: 'Last updated',
      description: 'Set when a published story is materially revised. Shown to readers and sent to search engines.',
      type: 'datetime',
      group: 'meta',
    }),
    defineField({
      name: 'category',
      title: 'Category',
      description: 'The section this story belongs in. Exactly one.',
      type: 'reference',
      to: [{type: 'category'}],
      group: 'meta',
      validation: warnIfReferenceUnpublished('category'),
    }),
    defineField({
      name: 'topics',
      title: 'Topics',
      description: 'Cross-cutting subjects. An article can carry several.',
      type: 'array',
      group: 'meta',
      of: [defineArrayMember({type: 'reference', to: [{type: 'topic'}]})],
    }),
    defineField({
      name: 'featured',
      title: 'Feature on the front page',
      description: 'Pins this story to the lead slot. Newest featured story wins; otherwise the newest story leads.',
      type: 'boolean',
      group: 'meta',
      initialValue: false,
    }),
    defineField({
      name: 'heroImage',
      title: 'Hero image',
      type: 'image',
      group: 'content',
      options: {hotspot: true},
      fields: [
        defineField({
          name: 'alt',
          title: 'Alternative text',
          type: 'string',
          description: 'Describes the image for screen readers and when the image fails to load.',
          validation: altTextRequiredWhenImageSet,
        }),
        defineField({
          name: 'caption',
          title: 'Caption',
          description: 'Optional visible caption. Not a substitute for alternative text.',
          type: 'string',
        }),
      ],
    }),
    defineField({
      name: 'body',
      title: 'Body',
      type: 'array',
      group: 'content',
      of: [
        defineArrayMember({type: 'block'}),
        defineArrayMember({
          type: 'image',
          options: {hotspot: true},
          fields: [
            defineField({
              name: 'alt',
              title: 'Alternative text',
              type: 'string',
              validation: altTextRequiredWhenImageSet,
            }),
            defineField({name: 'caption', title: 'Caption', type: 'string'}),
          ],
        }),
      ],
    }),
    defineField({
      name: 'corrections',
      title: 'Corrections',
      description: 'Appended to the foot of the article. Correcting in public is the point.',
      type: 'array',
      group: 'meta',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'correction',
          fields: [
            defineField({
              name: 'correctedAt',
              title: 'Date',
              type: 'datetime',
              initialValue: () => new Date().toISOString(),
              validation: (rule) => rule.required(),
            }),
            defineField({
              name: 'note',
              title: 'What was corrected',
              type: 'text',
              rows: 2,
              validation: (rule) => rule.required(),
            }),
          ],
          preview: {select: {title: 'note', subtitle: 'correctedAt'}},
        }),
      ],
    }),
  ],
  preview: {
    select: {
      title: 'headline',
      subtitle: 'byline',
      media: 'heroImage',
    },
  },
})
