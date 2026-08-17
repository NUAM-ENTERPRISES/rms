import { PERMISSIONS } from '../../constants/permissions';
import { ROLE_NAMES } from '../../constants/role-ids';
import {
  getAssignedInterviewCoordinatorFilter,
  getAssignedInterviewCoordinatorRelationFilter,
  shouldScopeToAssignedInterviewCoordinator,
} from '../interview-coordinator-assignment-scope.util';

describe('interview-coordinator-assignment-scope.util', () => {
  it('scopes Interview Coordinators without manage:interviews', () => {
    const user = {
      id: 'ic-a',
      roles: [ROLE_NAMES.INTERVIEW_COORDINATOR],
      permissions: [PERMISSIONS.READ_INTERVIEWS, PERMISSIONS.WRITE_INTERVIEWS],
    };

    expect(shouldScopeToAssignedInterviewCoordinator(user)).toBe(true);
    expect(getAssignedInterviewCoordinatorFilter(user)).toEqual({
      assignedInterviewCoordinatorId: 'ic-a',
    });
    expect(getAssignedInterviewCoordinatorRelationFilter(user)).toEqual({
      candidateProjectMap: { assignedInterviewCoordinatorId: 'ic-a' },
    });
  });

  it('does not scope Manager with wildcard permissions', () => {
    const user = {
      id: 'manager-1',
      roles: [ROLE_NAMES.MANAGER],
      permissions: [PERMISSIONS.ALL],
    };

    expect(shouldScopeToAssignedInterviewCoordinator(user)).toBe(false);
    expect(getAssignedInterviewCoordinatorFilter(user)).toBeUndefined();
  });

  it('does not scope users with manage:interviews', () => {
    const user = {
      id: 'ic-mgr',
      roles: [ROLE_NAMES.INTERVIEW_COORDINATOR],
      permissions: [PERMISSIONS.MANAGE_INTERVIEWS],
    };

    expect(shouldScopeToAssignedInterviewCoordinator(user)).toBe(false);
    expect(getAssignedInterviewCoordinatorFilter(user)).toBeUndefined();
  });

  it('scopes Interview Coordinator with write but not manage:interviews (production IC seed)', () => {
    const user = {
      id: 'ic-a',
      sub: 'ic-a',
      roles: [ROLE_NAMES.INTERVIEW_COORDINATOR],
      permissions: [
        PERMISSIONS.READ_INTERVIEWS,
        PERMISSIONS.WRITE_INTERVIEWS,
        PERMISSIONS.SCHEDULE_INTERVIEWS,
      ],
    };

    expect(shouldScopeToAssignedInterviewCoordinator(user)).toBe(true);
    expect(getAssignedInterviewCoordinatorFilter(user)).toEqual({
      assignedInterviewCoordinatorId: 'ic-a',
    });
  });

  it('does not scope recruiters', () => {
    const user = {
      id: 'rec-1',
      roles: [ROLE_NAMES.RECRUITER],
      permissions: [PERMISSIONS.READ_INTERVIEWS],
    };

    expect(shouldScopeToAssignedInterviewCoordinator(user)).toBe(false);
    expect(getAssignedInterviewCoordinatorFilter(user)).toBeUndefined();
  });
});
