import { describe, expect, it } from 'vitest';

import {
  hasRole,
  isAdmin,
  isAdminField,
  isEditorOrAdmin,
  isStaff,
  publicRead,
  type Role,
} from '../src/access/roles';

describe('access control roles helper', () => {
  describe('hasRole', () => {
    it('returns false for null, undefined, or empty user objects', () => {
      expect(hasRole(null, 'admin')).toBe(false);
      expect(hasRole(undefined, 'admin')).toBe(false);
      expect(hasRole({}, 'admin')).toBe(false);
      expect(hasRole({ role: null }, 'admin')).toBe(false);
    });

    it('returns false when user role does not match permitted roles', () => {
      expect(hasRole({ role: 'writer' }, 'admin')).toBe(false);
      expect(hasRole({ role: 'writer' }, 'admin', 'editor')).toBe(false);
    });

    it('returns true when user role matches one of the permitted roles', () => {
      expect(hasRole({ role: 'editor' }, 'admin', 'editor')).toBe(true);
      expect(hasRole({ role: 'admin' }, 'admin', 'editor')).toBe(true);
      expect(hasRole({ role: 'writer' }, 'writer')).toBe(true);
    });
  });

  describe('isStaff access rule', () => {
    it('refuses access when no user is signed in', () => {
      expect(isStaff({ req: { user: null } } as any)).toBe(false);
      expect(isStaff({ req: { user: undefined } } as any)).toBe(false);
    });

    it('allows access for any signed-in staff user', () => {
      expect(isStaff({ req: { user: { id: 1, role: 'writer' } } } as any)).toBe(true);
      expect(isStaff({ req: { user: { id: 2, role: 'editor' } } } as any)).toBe(true);
      expect(isStaff({ req: { user: { id: 3, role: 'admin' } } } as any)).toBe(true);
    });
  });

  describe('isAdmin and isEditorOrAdmin access rules', () => {
    it('isAdmin permits only admin users', () => {
      expect(isAdmin({ req: { user: { id: 1, role: 'writer' } } } as any)).toBe(false);
      expect(isAdmin({ req: { user: { id: 2, role: 'editor' } } } as any)).toBe(false);
      expect(isAdmin({ req: { user: { id: 3, role: 'admin' } } } as any)).toBe(true);
      expect(isAdmin({ req: { user: null } } as any)).toBe(false);
    });

    it('isEditorOrAdmin permits editors and admins but refuses writers and guests', () => {
      expect(isEditorOrAdmin({ req: { user: null } } as any)).toBe(false);
      expect(isEditorOrAdmin({ req: { user: { id: 1, role: 'writer' } } } as any)).toBe(false);
      expect(isEditorOrAdmin({ req: { user: { id: 2, role: 'editor' } } } as any)).toBe(true);
      expect(isEditorOrAdmin({ req: { user: { id: 3, role: 'admin' } } } as any)).toBe(true);
    });

    it('isAdminField restricts sensitive fields to admin users', () => {
      expect(isAdminField({ req: { user: { id: 2, role: 'editor' } } } as any)).toBe(false);
      expect(isAdminField({ req: { user: { id: 3, role: 'admin' } } } as any)).toBe(true);
    });
  });

  describe('publicRead access rule', () => {
    it('grants read access unconditionally', () => {
      expect(publicRead({ req: { user: null } } as any)).toBe(true);
      expect(publicRead({ req: { user: { id: 1, role: 'writer' } } } as any)).toBe(true);
    });
  });
});
