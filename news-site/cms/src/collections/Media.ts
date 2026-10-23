import type { CollectionConfig } from 'payload'

import { isEditorOrAdmin, isStaff, publicRead } from '../access/roles'

export const Media: CollectionConfig = {
  slug: 'media',
  access: {
    read: publicRead,
    create: isStaff,
    update: isEditorOrAdmin,
    delete: isEditorOrAdmin,
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      required: true,
      admin: { description: 'Describes the image for screen readers and when it fails to load.' },
    },
    {
      name: 'caption',
      type: 'text',
      admin: { description: 'Optional visible caption. Not a substitute for alternative text.' },
    },
  ],
  upload: {
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/avif'],
    // Editors choose the focal point; generated sizes crop around it.
    focalPoint: true,
    crop: true,
    imageSizes: [
      { name: 'thumbnail', width: 400, height: 225, position: 'centre' },
      { name: 'card', width: 768, height: 432, position: 'centre' },
      { name: 'hero', width: 1600, height: 900, position: 'centre' },
    ],
    adminThumbnail: 'thumbnail',
  },
}
