import { PERMISSIONS } from '../../constants/permissions';
import { ROLE_NAMES } from '../../constants/role-ids';
import {
  getAssignedDocumentationExecutiveFilter,
  shouldScopeToAssignedDocumentationExecutive,
} from '../documentation-assignment-scope.util';

describe('documentation-assignment-scope.util', () => {
  it('scopes Documentation Executives without manage:documents', () => {
    const user = {
      id: 'rema',
      roles: [ROLE_NAMES.DOCUMENTATION_EXECUTIVE],
      permissions: [PERMISSIONS.READ_DOCUMENTS, PERMISSIONS.VERIFY_DOCUMENTS],
    };

    expect(shouldScopeToAssignedDocumentationExecutive(user)).toBe(true);
    expect(getAssignedDocumentationExecutiveFilter(user)).toEqual({
      assignedDocumentationExecutiveId: 'rema',
    });
  });

  it('does not scope Manager with wildcard permissions', () => {
    const user = {
      id: 'manager-1',
      roles: [ROLE_NAMES.MANAGER],
      permissions: [PERMISSIONS.ALL],
    };

    expect(shouldScopeToAssignedDocumentationExecutive(user)).toBe(false);
    expect(getAssignedDocumentationExecutiveFilter(user)).toBeUndefined();
  });

  it('does not scope Recruitment Lead with manage:documents', () => {
    const user = {
      id: 'rm-1',
      roles: ['Recruitment Lead'],
      permissions: [PERMISSIONS.READ_DOCUMENTS, PERMISSIONS.MANAGE_DOCUMENTS],
    };

    expect(shouldScopeToAssignedDocumentationExecutive(user)).toBe(false);
    expect(getAssignedDocumentationExecutiveFilter(user)).toBeUndefined();
  });

  it('does not scope System Admin with wildcard or manage:documents', () => {
    const wildcardAdmin = {
      id: 'admin-star',
      roles: [ROLE_NAMES.SYSTEM_ADMIN],
      permissions: [PERMISSIONS.ALL],
    };
    const manageAdmin = {
      id: 'admin-manage',
      roles: [ROLE_NAMES.SYSTEM_ADMIN],
      permissions: [PERMISSIONS.MANAGE_DOCUMENTS],
    };

    expect(shouldScopeToAssignedDocumentationExecutive(wildcardAdmin)).toBe(false);
    expect(getAssignedDocumentationExecutiveFilter(wildcardAdmin)).toBeUndefined();
    expect(shouldScopeToAssignedDocumentationExecutive(manageAdmin)).toBe(false);
    expect(getAssignedDocumentationExecutiveFilter(manageAdmin)).toBeUndefined();
  });

  it('does not scope recruiters', () => {
    const user = {
      id: 'rec-1',
      roles: [ROLE_NAMES.RECRUITER],
      permissions: [PERMISSIONS.READ_DOCUMENTS],
    };

    expect(shouldScopeToAssignedDocumentationExecutive(user)).toBe(false);
    expect(getAssignedDocumentationExecutiveFilter(user)).toBeUndefined();
  });
});
