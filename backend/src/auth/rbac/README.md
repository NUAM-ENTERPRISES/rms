# RBAC (Role-Based Access Control) System

This directory contains the RBAC implementation for the Affiniks RMS backend, following the BE_GUIDELINES.md specifications.

## Overview

The RBAC system provides:
- **Role-based access control** with hierarchical permissions
- **Team scoping** for resource access
- **Caching** for performance optimization
- **Decorators and guards** for easy implementation

## Components

### Decorators

#### `@Roles(...roles: string[])`
Protects routes based on user roles.

```typescript
@Get('admin-only')
@Roles('Manager', 'CEO', 'Director')
async adminOnlyEndpoint() {
  // Only accessible by Manager, CEO, or Director
}
```

#### `@Permissions(...permissions: string[])`
Protects routes based on specific permissions.

```typescript
@Post('create-user')
@Permissions('manage:users')
async createUser() {
  // Only accessible by users with 'manage:users' permission
}
```

### Guards

#### `RolesGuard`
Validates user roles against required roles.

#### `PermissionsGuard`
Validates user permissions against required permissions.

#### `TeamScopeGuard`
Validates team access for team-scoped resources.

```typescript
@Get('team-projects')
@UseGuards(JwtAuthGuard, TeamScopeGuard)
async getTeamProjects() {
  // Validates user has access to the team
}
```

### Utilities

#### `RbacUtil`
Core utility class providing:
- `getUserRolesAndPermissions(userId)` - Get user's roles and permissions
- `hasRole(userId, requiredRoles)` - Check if user has required roles
- `hasPermission(userId, requiredPermissions)` - Check if user has required permissions
- `checkTeamAccess(userId, resourceTeamId)` - Check team access
- `clearUserCache(userId)` - Clear user's RBAC cache

## Role Hierarchy

1. **CEO/Director** - Full system access (`*` permissions)
2. **Manager** - Access to multiple teams, user management
3. **Team Head** - Access to assigned teams, candidate management
4. **Team Lead** - Task monitoring, recruiter management
5. **Recruiter** - Candidate handling, project reading
6. **Documentation Executive** - Document verification
7. **Processing Executive** - Post-selection workflows

## Caching

RBAC data is cached in memory for 60 seconds to improve performance. Cache is automatically invalidated when:
- User roles are modified
- User permissions are updated

## Usage Examples

### Controller with Role Protection
```typescript
@Controller('projects')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProjectsController {
  @Get()
  @Roles('Manager', 'Team Head')
  async getProjects() {
    // Implementation
  }
}
```

### Service with Permission Check
```typescript
@Injectable()
export class ProjectsService {
  constructor(private rbacUtil: RbacUtil) {}

  async createProject(userId: string, projectData: any) {
    const hasPermission = await this.rbacUtil.hasPermission(userId, ['write:projects']);
    if (!hasPermission) {
      throw new ForbiddenException('Insufficient permissions');
    }
    // Implementation
  }
}
```

### Team-Scoped Resource
```typescript
@Get('candidates')
@UseGuards(JwtAuthGuard, TeamScopeGuard)
async getCandidates(@Body() body: { teamId: string }) {
  // TeamScopeGuard validates access to body.teamId
}
```

## Best Practices

1. **Use roles for broad access control** (e.g., `@Roles('Manager')`)
2. **Use permissions for specific actions** (e.g., `@Permissions('manage:users')`)
3. **Always validate team access** for team-scoped resources
4. **Cache user RBAC data** for performance
5. **Clear cache** when user roles/permissions change

## Testing

RBAC components are thoroughly tested with:
- Unit tests for utilities and guards
- E2E tests for role-based endpoints
- Integration tests for team scoping

See `__tests__/` directories for test examples.
