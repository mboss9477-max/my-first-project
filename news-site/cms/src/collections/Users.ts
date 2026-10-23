import type { CollectionConfig } from 'payload'

import { hasRole, isAdmin, isAdminField } from '../access/roles'

/**
 * Staff accounts only (admin, editor, writer). Public readers get their own
 * auth collection in Phase 2 so they can never reach the admin panel.
 */
export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'email',
  },
  auth: {
    // T1: slow down password guessing. Five wrong passwords lock the account
    // for ten minutes, whatever the source address.
    maxLoginAttempts: 5,
    lockTime: 10 * 60 * 1000,
    // T4: a stolen session stops working after two hours. Editors stay signed
    // in while they work (the admin refreshes the token as they go).
    tokenExpiration: 2 * 60 * 60,
    cookies: {
      // HTTPS-only cookies outside local development; never sent cross-site.
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Lax',
    },
  },
  access: {
    // Staff can see each other (for bylines and review); readers cannot.
    read: ({ req: { user } }) => Boolean(user),
    create: isAdmin,
    delete: isAdmin,
    // Admins edit anyone; everyone else only themselves.
    update: ({ req: { user } }) => {
      if (!user) return false
      if (hasRole(user, 'admin')) return true
      return { id: { equals: user.id } }
    },
  },
  fields: [
    {
      name: 'name',
      type: 'text',
    },
    {
      name: 'role',
      type: 'select',
      required: true,
      defaultValue: 'writer',
      saveToJWT: true,
      options: [
        { label: 'Admin', value: 'admin' },
        { label: 'Editor', value: 'editor' },
        { label: 'Writer', value: 'writer' },
      ],
      // Only admins can grant or change roles, including their own.
      access: {
        create: isAdminField,
        update: isAdminField,
      },
    },
  ],
}
