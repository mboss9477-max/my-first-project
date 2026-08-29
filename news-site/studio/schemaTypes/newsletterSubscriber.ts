import {defineField, defineType} from 'sanity'

/**
 * Captures newsletter signups directly in Sanity until a real ESP (Buttondown,
 * Ghost, Mailchimp) is chosen — see ISSUES.md. Export this list and import it
 * into that provider once one is picked; this is a holding pattern, not the
 * final home for subscriber data.
 */
export const newsletterSubscriber = defineType({
  name: 'newsletterSubscriber',
  title: 'Newsletter subscriber',
  type: 'document',
  fields: [
    defineField({
      name: 'email',
      title: 'Email',
      type: 'string',
      validation: (rule) =>
        rule
          .required()
          .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, {name: 'email', invert: false}),
    }),
    defineField({
      name: 'subscribedAt',
      title: 'Subscribed at',
      type: 'datetime',
      readOnly: true,
    }),
    defineField({
      name: 'source',
      title: 'Source page',
      description: 'The path the signup came from, for tracking which placements convert.',
      type: 'string',
      readOnly: true,
    }),
  ],
  preview: {
    select: {title: 'email', subtitle: 'subscribedAt'},
  },
})
