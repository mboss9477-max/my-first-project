import type { Access, FieldAccess } from 'payload'

export type Role = 'admin' | 'editor' | 'writer'

type MaybeUser = { id?: number | string; role?: Role | null } | null | undefined

export const hasRole = (user: MaybeUser, ...roles: Role[]) =>
  Boolean(user?.role && roles.includes(user.role))

/** Any signed-in staff member. Readers (Phase 2) live in a separate collection. */
export const isStaff: Access = ({ req: { user } }) => Boolean(user)

export const isAdmin: Access = ({ req: { user } }) => hasRole(user, 'admin')

export const isEditorOrAdmin: Access = ({ req: { user } }) => hasRole(user, 'admin', 'editor')

export const isAdminField: FieldAccess = ({ req: { user } }) => hasRole(user, 'admin')

/** Public can read; only editors and admins change taxonomy and authors. */
export const publicRead: Access = () => true
