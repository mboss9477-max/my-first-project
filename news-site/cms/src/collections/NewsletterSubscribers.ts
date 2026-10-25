import type { CollectionConfig } from 'payload'

import { isAdmin } from '../access/roles'
import { subscribeHandler } from '../endpoints/subscribe'

/**
 * Personal data: admins only. The public site's signup form adds subscribers
 * through one narrow, secret-protected endpoint (POST
 * /api/newsletter-subscribers/subscribe, see src/endpoints/subscribe.ts),
 * called from the website's server, never from the browser. Everything else
 * about this collection stays closed to the public API.
 */
export const NewsletterSubscribers: CollectionConfig = {
  slug: 'newsletter-subscribers',
  admin: { useAsTitle: 'email' },
  endpoints: [{ path: '/subscribe', method: 'post', handler: subscribeHandler }],
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
