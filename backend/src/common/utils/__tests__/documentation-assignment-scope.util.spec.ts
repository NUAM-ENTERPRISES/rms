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

  it('does not scope users with manage:documents', () => {
    const user = {
      id: 'admin',
      roles: [ROLE_NAMES.SYSTEM_ADMIN],
      permissions: [PERMISSIONS.MANAGE_DOCUMENTS],
    };

    expect(shouldScopeToAssignedDocumentationExecutive(user)).toBe(false);
    expect(getAssignedDocumentationExecutiveFilter(user)).toBeUndefined();
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
