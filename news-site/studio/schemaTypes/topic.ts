import {defineField, defineType} from 'sanity'

/**
 * A cross-cutting subject, distinct from a category. An article sits in exactly
 * one category (its section) but can carry several topics — which is what makes
 * the Trending strip and /topic pages possible.
 */
export const topic = defineType({
  name: 'topic',
  title: 'Topic',
  type: 'document',
  fields: [
    defineField({
      name: 'name',
      title: 'Name',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: {source: 'name', maxLength: 96},
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'trending',
      title: 'Show in Trending strip',
      description: 'Surfaces this topic in the header. Keep to three or so.',
      type: 'boolean',
      initialValue: false,
    }),
  ],
  preview: {
    select: {title: 'name', subtitle: 'slug.current'},
  },
})
