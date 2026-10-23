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
  auth: true,
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
