import { APIError, type Access, type CollectionConfig, type Where } from 'payload'

import { asksToPublish, hasRole, isEditorOrAdmin } from '../access/roles'
import { notifyAfterArticleChange, notifyAfterArticleDelete } from '../hooks/notifyWeb'
import { SLUG_PATTERN, slugify } from './slug'

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
  return !asksToPublish(data?._status)
}

/**
 * Editors and admins edit anything. Writers edit only their own articles
 * while they are drafts; returning a constraint on `_status` is the pattern
 * Payload documents for draft-only roles (it hides the Publish button).
 */
const updateArticles: Access = ({ req: { user }, data }) => {
  if (!user) return false
  if (hasRole(user, 'admin', 'editor')) return true
  if (asksToPublish(data?._status)) return false
  const ownDrafts: Where = {
    and: [{ createdBy: { equals: user.id } }, { _status: { equals: 'draft' } }],
  }
  return ownDrafts
}

export const Articles: CollectionConfig = {
  slug: 'articles',
  admin: {
    useAsTitle: 'headline',
    defaultColumns: ['headline', 'category', 'reviewStatus', '_status', 'publishedAt'],
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
      // Each language is published (or not) on its own.
      localizeStatus: true,
    },
  },
  hooks: {
    afterChange: [notifyAfterArticleChange],
    afterDelete: [notifyAfterArticleDelete],
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
    { name: 'headline', type: 'text', required: true, localized: true },
    {
      name: 'slug',
      type: 'text',
      // One address for every language (/es/article/<same-slug>): Arabic and
      // Chinese headlines cannot make a Latin-letter slug, and one slug keeps
      // the links between language versions trivial. See docs/localization-spike.md.
      unique: true,
      index: true,
      admin: {
        description:
          'The web address of the story. Filled in from the headline if left empty; it is never changed automatically after that. Changing it after publishing breaks existing links.',
      },
      hooks: {
        // Field validation is skipped for drafts, so normalise here instead:
        // a typed slug is cleaned up ("Bad Slug!" -> "bad-slug"), an empty one
        // is filled from the headline. Only empty slugs are generated, so a
        // later headline edit never moves a URL.
        beforeValidate: [
          ({ value, siblingData }) => {
            const typed = typeof value === 'string' ? slugify(value) : ''
            if (typed) return typed
            const headline = typeof siblingData?.headline === 'string' ? siblingData.headline : ''
            return headline ? slugify(headline) || undefined : undefined
          },
        ],
      },
      validate: (value: string | null | undefined, { data }: { data: Partial<{ _status: string }> }) => {
        if (!value) return data?._status === 'published' ? 'A web address (slug) is needed before publishing.' : true
        return SLUG_PATTERN.test(value)
          ? true
          : 'Use lowercase letters, numbers and single hyphens only, e.g. "council-approves-cycle-lanes".'
      },
    },
    {
      name: 'reviewStatus',
      type: 'select',
      // Each language is reviewed on its own.
      localized: true,
      defaultValue: 'writing',
      options: [
        { label: 'Writing', value: 'writing' },
        { label: 'Ready for review', value: 'ready' },
        { label: 'Changes requested', value: 'changes' },
      ],
      admin: {
        position: 'sidebar',
        description: 'Writers: set to "Ready for review" when the draft is finished. Editors publish.',
      },
      hooks: {
        // A hook, not `validate`: Payload skips validation on draft saves.
        // Writers hand a draft over or take it back; only editors request
        // changes. A writer may keep saving an article already in that state.
        beforeChange: [
          ({ value, originalDoc, req }) => {
            if (value === 'changes' && hasRole(req.user, 'writer') && originalDoc?.reviewStatus !== 'changes') {
              throw new APIError('Only an editor can mark an article as "Changes requested".', 403, undefined, true)
            }
            return value
          },
        ],
      },
    },
    {
      name: 'excerpt',
      type: 'textarea',
      localized: true,
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
    { name: 'body', type: 'richText', localized: true },
    {
      name: 'corrections',
      type: 'array',
      admin: { description: 'Appended to the foot of the article. Correcting in public is the point.' },
      fields: [
        { name: 'correctedAt', type: 'date', required: true },
        { name: 'note', type: 'textarea', required: true, localized: true },
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
