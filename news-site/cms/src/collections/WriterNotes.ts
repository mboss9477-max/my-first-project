import type { Access, CollectionConfig, Where } from 'payload'

import { hasRole, isAdmin, isEditorOrAdmin, isStaff } from '../access/roles'

/**
 * Notes from the newsroom about a story: a writer flags a problem or leaves a
 * message, an editor reads it and marks it resolved. Staff only; never part of
 * the public API. No email yet: reading the notes is done in the admin (email
 * comes later, once a mail provider is chosen and approved).
 *
 * Who can do what:
 * - Any signed-in staff member can leave a note.
 * - A writer sees only their own notes; editors and admins see all of them.
 * - Only editors and admins change a note (to mark it resolved).
 * - Only admins delete one.
 * - The author of a note is set by the system and cannot be chosen.
 */
const readNotes: Access = ({ req: { user } }) => {
  if (!user) return false
  if (hasRole(user, 'admin', 'editor')) return true
  const own: Where = { createdBy: { equals: user.id } }
  return own
}

export const WriterNotes: CollectionConfig = {
  slug: 'writer-notes',
  labels: { singular: 'Note', plural: 'Notes' },
  admin: {
    useAsTitle: 'text',
    defaultColumns: ['text', 'article', 'status', 'createdBy', 'createdAt'],
    group: 'Newsroom',
    description: 'Messages from the newsroom about a story. Editors read them and mark them resolved.',
  },
  access: {
    read: readNotes,
    create: isStaff,
    update: isEditorOrAdmin,
    delete: isAdmin,
  },
  hooks: {
    beforeChange: [
      ({ req, operation, data }) => {
        // Record who wrote it; whatever the caller sent for `createdBy` is ignored.
        if (operation === 'create') {
          return { ...data, createdBy: req.user?.id }
        }
        return data
      },
    ],
  },
  fields: [
    {
      name: 'article',
      type: 'relationship',
      relationTo: 'articles',
      required: true,
      admin: { description: 'The story this note is about.' },
    },
    {
      name: 'text',
      type: 'textarea',
      required: true,
      maxLength: 2000,
      admin: { description: 'What the editors should know. Plain text, up to 2000 characters.' },
    },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'open',
      options: [
        { label: 'Open', value: 'open' },
        { label: 'Resolved', value: 'resolved' },
      ],
      admin: { position: 'sidebar' },
      access: {
        // A writer cannot mark their own note resolved when creating it.
        create: ({ req: { user } }) => hasRole(user, 'admin', 'editor'),
      },
    },
    {
      name: 'createdBy',
      type: 'relationship',
      relationTo: 'users',
      admin: { readOnly: true, position: 'sidebar' },
      access: {
        create: () => false,
        update: () => false,
      },
    },
  ],
}
