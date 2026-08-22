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

export const article = defineType({
  name: 'article',
  title: 'Article',
  type: 'document',
  fields: [
    defineField({
      name: 'headline',
      title: 'Headline',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: {
        source: 'headline',
        maxLength: 96,
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'excerpt',
      title: 'Excerpt',
      description:
        'One or two sentences summarising the story. Shown on cards and used as the search-result and social-share description.',
      type: 'text',
      rows: 3,
      validation: (rule) => rule.max(280).warning('Keep under 280 characters so it is not truncated in search results.'),
    }),
    defineField({
      name: 'byline',
      title: 'Byline',
      description: 'Author name',
      type: 'string',
    }),
    defineField({
      name: 'publishedAt',
      title: 'Published at',
      type: 'datetime',
      initialValue: () => new Date().toISOString(),
    }),
    defineField({
      name: 'category',
      title: 'Category',
      type: 'reference',
      to: [{type: 'category'}],
      /**
       * Sanity lets you publish an article that references a document which is
       * still a draft. The reference then dangles: the Studio resolves it (the
       * Studio can read drafts) while the public API cannot, so the category
       * silently disappears from the live site.
       *
       * A draft lives at `drafts.<id>`, so querying the bare id matches only a
       * published document. Raised as a warning rather than an error so it does
       * not block publishing — it just makes the consequence visible first.
       */
      validation: (rule) =>
        rule
          .custom(async (value, context) => {
            const ref = (value as {_ref?: string} | undefined)?._ref
            if (!ref) return true

            const publishedId = ref.replace(/^drafts\./, '')
            const client = context.getClient({apiVersion: '2024-10-01'})

            const isPublished = await client.fetch<boolean>(
              'defined(*[_id == $id][0]._id)',
              {id: publishedId},
            )

            return isPublished
              ? true
              : 'This category has not been published yet. Publish the category document too, or it will not appear on the live site.'
          })
          .warning(),
    }),
    defineField({
      name: 'heroImage',
      title: 'Hero image',
      type: 'image',
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
            defineField({
              name: 'caption',
              title: 'Caption',
              type: 'string',
            }),
          ],
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
