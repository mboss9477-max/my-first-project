import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import sharp from 'sharp'
import { fileURLToPath } from 'url'

import { hasRole } from './access/roles'
import { guardJobsCollection } from './access/jobsGuard'
import { Articles } from './collections/Articles'
import { Media } from './collections/Media'
import { NewsletterSubscribers } from './collections/NewsletterSubscribers'
import { Authors, Categories, Topics } from './collections/Taxonomy'
import { Users } from './collections/Users'
import { WriterNotes } from './collections/WriterNotes'
import { databaseAdapter } from './database'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

const secret = process.env.PAYLOAD_SECRET
if (!secret) {
  throw new Error('PAYLOAD_SECRET is not set. Copy .env.example to .env and fill it in.')
}

/**
 * The address this CMS is served from. Browsers may only send credentialed
 * requests (cookies) from these origins (CSRF protection, threat-model T5).
 * Names only in the repo: set CMS_URL in each environment (AGENTS.md S17).
 */
const cmsUrl = process.env.CMS_URL || 'http://localhost:3200'

export default buildConfig({
  serverURL: cmsUrl,
  csrf: [cmsUrl],
  cors: [cmsUrl],
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [Articles, Categories, Topics, Authors, Media, NewsletterSubscribers, WriterNotes, Users],
  // Several languages, with only English filled in for now (task 1.8a). The
  // other languages are configured so the database is built for them from the
  // start; adding content later is just editing, not a data migration.
  // Publish status per language (Payload marks this experimental): without it,
  // an unfinished Spanish draft goes public the moment English is published.
  experimental: { localizeStatus: true },
  localization: {
    locales: [
      { label: 'English', code: 'en' },
      { label: 'Español', code: 'es' },
      { label: '中文', code: 'zh' },
      { label: 'العربية', code: 'ar', rtl: true },
    ],
    defaultLocale: 'en',
    // A language without its own text shows the English text (the website can
    // tell the difference and say so; see docs/localization-spike.md).
    fallback: true,
  },
  editor: lexicalEditor(),
  secret,
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: databaseAdapter(),
  sharp,
  plugins: [],
  jobs: {
    // Scheduled publish/unpublish jobs are queued on the default queue and
    // only run when something processes it. Check every minute.
    autoRun: [{ cron: '* * * * *', queue: 'default' }],
    // Scheduling belongs to editors; triggering the runner by hand to admins.
    // (Payload only applies these when a caller opts in with overrideAccess:
    // false, as its REST endpoints do. The admin's schedule button does not,
    // so guardJobsCollection enforces the same rule inside the jobs collection.)
    access: {
      queue: ({ req }) => hasRole(req.user, 'admin', 'editor'),
      cancel: ({ req }) => hasRole(req.user, 'admin', 'editor'),
      run: ({ req }) => hasRole(req.user, 'admin'),
    },
    jobsCollectionOverrides: guardJobsCollection,
    // Without this Payload writes job records straight to the database and
    // skips collection hooks, which would bypass guardJobsCollection.
    runHooks: true,
  },
})
