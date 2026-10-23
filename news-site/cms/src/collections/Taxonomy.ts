import type { CollectionConfig } from 'payload'

import { isEditorOrAdmin, publicRead } from '../access/roles'

const slugField = {
  name: 'slug',
  type: 'text',
  required: true,
  unique: true,
  index: true,
} as const

const taxonomyAccess = {
  read: publicRead,
  create: isEditorOrAdmin,
  update: isEditorOrAdmin,
  delete: isEditorOrAdmin,
}

export const Categories: CollectionConfig = {
  slug: 'categories',
  admin: { useAsTitle: 'name' },
  access: taxonomyAccess,
  fields: [{ name: 'name', type: 'text', required: true }, slugField],
}

export const Topics: CollectionConfig = {
  slug: 'topics',
  admin: { useAsTitle: 'name' },
  access: taxonomyAccess,
  fields: [
    { name: 'name', type: 'text', required: true },
    slugField,
    {
      name: 'trending',
      type: 'checkbox',
      defaultValue: false,
      admin: { description: 'Show in the trending strip under the masthead.' },
    },
  ],
}

export const Authors: CollectionConfig = {
  slug: 'authors',
  admin: { useAsTitle: 'name' },
  access: taxonomyAccess,
  fields: [
    { name: 'name', type: 'text', required: true },
    slugField,
    { name: 'role', type: 'text', admin: { description: 'e.g. "Political correspondent".' } },
    { name: 'bio', type: 'textarea' },
  ],
}
