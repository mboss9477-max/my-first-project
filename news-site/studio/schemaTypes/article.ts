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
