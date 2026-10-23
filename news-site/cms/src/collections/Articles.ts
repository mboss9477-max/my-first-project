import type { Access, CollectionConfig, Where } from 'payload'

import { hasRole, isEditorOrAdmin } from '../access/roles'

/**
 * Public sees published articles only. Editors and admins see everything.
 * Writers see published articles plus their own drafts, never a colleague's
 * unpublished work.
 */
const readArticles: Access = ({ req: { user } }) => {
  if (!user) return { _status: { equals: 'published' } }
  if (hasRole(user, 'admin', 'editor')) return true
  const publishedOrOwn: Where = {
    or: [{ _status: { equals: 'published' } }, { createdBy: { equals: user.id } }],
  }
  return publishedOrOwn
}

/**
 * Version history holds every saved draft, so it needs the same rule:
 * writers only see the history of articles they created. Found by Gemini's
 * adversarial review of PR #9 (case c); `isStaff` leaked colleagues' drafts.
 */
const readArticleVersions: Access = ({ req: { user } }) => {
  if (!user) return false
  if (hasRole(user, 'admin', 'editor')) return true
  const ownHistory: Where = { 'version.createdBy': { equals: user.id } }
  return ownHistory
}

/**
 * Writers may create drafts but never publish: a create carrying
 * `_status: 'published'` from a writer is refused.
 */
const createArticles: Access = ({ req: { user }, data }) => {
  if (!user) return false
  if (hasRole(user, 'admin', 'editor')) return true
  return data?._status !== 'published'
}

/**
 * Editors and admins edit anything. Writers edit only their own articles
 * while they are drafts; returning a constraint on `_status` is the pattern
 * Payload documents for draft-only roles (it hides the Publish button).
 */
const updateArticles: Access = ({ req: { user }, data }) => {
  if (!user) return false
  if (hasRole(user, 'admin', 'editor')) return true
  if (data?._status === 'published') return false
  const ownDrafts: Where = {
    and: [{ createdBy: { equals: user.id } }, { _status: { equals: 'draft' } }],
  }
  return ownDrafts
}

export const Articles: CollectionConfig = {
  slug: 'articles',
  admin: {
    useAsTitle: 'headline',
    defaultColumns: ['headline', 'category', '_status', 'publishedAt'],
  },
  access: {
    read: readArticles,
    create: createArticles,
    update: updateArticles,
    delete: isEditorOrAdmin,
    readVersions: readArticleVersions,
  },
  versions: {
    maxPerDoc: 50,
    drafts: {
      autosave: { interval: 2000 },
      schedulePublish: true,
    },
  },
  hooks: {
    beforeChange: [
      ({ req, operation, data }) => {
        // Record who created the article; used for writer ownership.
        if (operation === 'create' && req.user) {
          return { ...data, createdBy: req.user.id }
        }
        return data
      },
    ],
  },
  fields: [
    { name: 'headline', type: 'text', required: true },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: { description: 'URL part. Changing it after publishing breaks existing links.' },
    },
    {
      name: 'excerpt',
      type: 'textarea',
      maxLength: 280,
      admin: { description: 'One or two sentences. Shown on cards, search results and social shares.' },
    },
    {
      name: 'author',
      type: 'relationship',
      relationTo: 'authors',
      admin: { description: 'Leave empty and use the byline override for guest writers.' },
    },
    {
      name: 'byline',
      type: 'text',
      admin: { description: 'Used only when no author is set, e.g. "CS News Staff".' },
    },
    { name: 'publishedAt', type: 'date', admin: { date: { pickerAppearance: 'dayAndTime' } } },
    {
      name: 'revisedAt',
      type: 'date',
      admin: {
        date: { pickerAppearance: 'dayAndTime' },
        description: 'Set when a published story is materially revised. Shown to readers.',
      },
    },
    { name: 'category', type: 'relationship', relationTo: 'categories', required: true },
    { name: 'topics', type: 'relationship', relationTo: 'topics', hasMany: true },
    {
      name: 'featured',
      type: 'checkbox',
      defaultValue: false,
      admin: { description: 'Pin to the front-page lead slot. Newest featured story wins.' },
    },
    { name: 'heroImage', type: 'upload', relationTo: 'media' },
    { name: 'body', type: 'richText' },
    {
      name: 'corrections',
      type: 'array',
      admin: { description: 'Appended to the foot of the article. Correcting in public is the point.' },
      fields: [
        { name: 'correctedAt', type: 'date', required: true },
        { name: 'note', type: 'textarea', required: true },
      ],
    },
    {
      name: 'createdBy',
      type: 'relationship',
      relationTo: 'users',
      admin: { readOnly: true, position: 'sidebar' },
      access: {
        // Set by the hook only; nobody edits ownership by hand.
        create: () => false,
        update: () => false,
      },
    },
  ],
}
