import type { CollectionConfig } from 'payload'

import { isAdmin } from '../access/roles'

/**
 * Personal data: admins only. The public site's signup form will write here
 * through a server-side call (plan task 1.9), never from the browser.
 */
export const NewsletterSubscribers: CollectionConfig = {
  slug: 'newsletter-subscribers',
  admin: { useAsTitle: 'email' },
  access: {
    read: isAdmin,
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  fields: [
    { name: 'email', type: 'email', required: true, unique: true },
    { name: 'subscribedAt', type: 'date', required: true },
  ],
}
