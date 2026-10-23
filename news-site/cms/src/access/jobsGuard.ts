import { APIError, type CollectionConfig, type Payload } from 'payload'

import type { Role } from './roles'

/**
 * Threat-model T22. Payload's admin "schedule publish" button queues and
 * cancels jobs through internal calls that skip access control, so a writer
 * who can reach the admin could schedule a publish or cancel an editor's
 * schedule. Collection hooks run on every operation, including those, so the
 * rule lives here.
 *
 * - Queueing a scheduled publish: the job carries the scheduling user in its
 *   input; refuse it when that user is a writer (or unknown).
 * - Cancelling (deleting) a scheduled job: refuse a signed-in writer.
 *
 * Internal operations with no user (the cron runner finishing jobs) are left
 * alone.
 */
const SCHEDULE_TASK = 'schedulePublish'

const staffRoles: Role[] = ['admin', 'editor']

async function roleOf(payload: Payload, userRef: unknown): Promise<Role | null> {
  const ref =
    typeof userRef === 'object' && userRef !== null
      ? (userRef as { relationTo?: string; value?: number | string })
      : { relationTo: 'users', value: userRef as number | string }
  if (ref.relationTo && ref.relationTo !== 'users') return null
  if (ref.value === undefined || ref.value === null) return null
  const user = await payload.findByID({
    collection: 'users',
    id: ref.value,
    depth: 0,
    overrideAccess: true,
  }).catch(() => null)
  return (user?.role as Role | undefined) ?? null
}

export const guardJobsCollection = ({
  defaultJobsCollection,
}: {
  defaultJobsCollection: CollectionConfig
}): CollectionConfig => ({
  ...defaultJobsCollection,
  hooks: {
    ...defaultJobsCollection.hooks,
    beforeChange: [
      ...(defaultJobsCollection.hooks?.beforeChange ?? []),
      async ({ data, operation, req }) => {
        if (operation !== 'create' || data?.taskSlug !== SCHEDULE_TASK) return data
        const schedulerRole = await roleOf(req.payload, data?.input?.user)
        if (!schedulerRole || !staffRoles.includes(schedulerRole)) {
          throw new APIError('Only an editor can schedule publishing.', 403, undefined, true)
        }
        return data
      },
    ],
    beforeDelete: [
      ...(defaultJobsCollection.hooks?.beforeDelete ?? []),
      ({ req }) => {
        if (req.user && !staffRoles.includes((req.user as { role?: Role }).role as Role)) {
          throw new APIError('Only an editor can cancel a scheduled publish.', 403, undefined, true)
        }
      },
    ],
  },
})
