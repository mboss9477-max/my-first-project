import type { CollectionConfig } from 'payload'

import { isEditorOrAdmin, isStaff, publicRead } from '../access/roles'
import { friendlyUploadRules } from './uploadRules'

export const Media: CollectionConfig = {
  slug: 'media',
  hooks: {
    beforeOperation: [friendlyUploadRules],
  },
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
      admin: {
        description:
          'Describe what is in the photo for readers who cannot see it. Accepted: JPG, PNG, WebP or AVIF under 25 MB. iPhone photos: export as JPEG first.',
      },
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
