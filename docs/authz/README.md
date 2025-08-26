# Authorization System - Affiniks RMS

This document explains how to implement permission-based UI rendering and access control in the Affiniks RMS application.

## Overview

The authorization system provides a declarative, type-safe way to control access to features and UI elements based on user roles and permissions. It follows the principle of **defense-in-depth** with both frontend UI filtering and backend API enforcement.

## Core Components

### 1. `useCan` Hook

The `useCan` hook provides permission checking functionality:

```tsx
import { useCan, useCanAny, useHasRole } from "@/hooks/useCan";

// Check if user has ALL specified permissions
const canManageUsers = useCan(["manage:users"]);

// Check if user has ANY of the specified permissions
const canReadData = useCanAny(["read:users", "read:all"]);

// Check if user has ANY of the specified roles
const isManager = useHasRole(["Manager", "Director"]);

// Check if user has ALL specified roles
const isAdmin = useHasAllRoles(["CEO", "Director"]);
```

### 2. `<Can/>` Component

The `<Can/>` component provides declarative permission-based rendering:

```tsx
import { Can } from "@/components/auth/Can";

// Render content only if user has specific permissions
<Can anyOf={["manage:users"]}>
  <Button>Add User</Button>
</Can>

// Render content only if user has specific roles
<Can roles={["Manager", "Director"]}>
  <AdminPanel />
</Can>

// Require ALL specified permissions
<Can allOf={["read:users", "write:users"]}>
  <UserEditor />
</Can>

// Provide fallback content
<Can anyOf={["manage:users"]} fallback={<p>No access</p>}>
  <UserManagement />
</Can>
```

### 3. Convenience Components

Pre-built components for common patterns:

```tsx
import { CanManage, CanRead, IsAdmin, IsManager } from "@/components/auth/Can";

<CanManage>
  <UserManagementPanel />
</CanManage>

<CanRead>
  <UserList />
</CanRead>

<IsAdmin>
  <SystemSettings />
</IsAdmin>

<IsManager>
  <TeamManagement />
</IsManager>
```

## Permission Structure

### Permission Format

Permissions follow the format: `{action}:{resource}`

- **Actions**: `read`, `write`, `manage`, `verify`, `delete`
- **Resources**: `users`, `projects`, `candidates`, `documents`, `teams`, `all`

### Common Permissions

```tsx
// Global permissions
"*"                    // Super admin - access to everything
"read:all"            // Read access to all resources
"write:all"           // Write access to all resources
"manage:all"          // Full management access

// User management
"read:users"          // View user list and details
"write:users"         // Create and update users
"manage:users"        // Full user management

// Project management
"read:projects"       // View projects
"write:projects"      // Create and update projects
"manage:projects"     // Full project management

// Candidate management
"read:candidates"     // View candidates
"write:candidates"    // Create and update candidates
"manage:candidates"   // Full candidate management

// Document management
"read:documents"      // View documents
"write:documents"     // Upload documents
"verify:documents"    // Verify document authenticity

// Team management
"read:teams"          // View teams
"write:teams"         // Create and update teams
"manage:teams"        // Full team management
```

## Role-Based Access

### Role Hierarchy

1. **CEO/Director**: Full system access (`*` permission)
2. **Manager**: Multi-team access with user management
3. **Team Head**: Assigned team access with candidate management
4. **Team Lead**: Task monitoring and recruiter management
5. **Recruiter**: Candidate handling and project viewing
6. **Documentation Executive**: Document verification
7. **Processing Executive**: Post-selection workflows

### Role Checking

```tsx
// Check for specific roles
const isAdmin = useHasRole(["CEO", "Director"]);
const isManager = useHasRole(["Manager"]);

// Check for multiple roles
<Can roles={["Manager", "Director"]}>
  <ManagementPanel />
</Can>
```

## Navigation Filtering

The sidebar navigation automatically filters based on user permissions:

```tsx
// Navigation items are automatically filtered
const navigationItems = [
  {
    label: "Users",
    to: "/users",
    icon: <Users />,
    permissions: ["read:users", "manage:users"], // Show if user has any of these
  },
  {
    label: "Settings",
    to: "/settings",
    icon: <Settings />,
    permissions: ["manage:all"],
    roles: ["CEO", "Director"], // Additional role requirement
  },
];
```

## Backend Enforcement

### API Guards

All API endpoints are protected with appropriate guards:

```tsx
// Controller method with permission guard
@Get('users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Permissions('read:users')
async getUsers() {
  // Only users with 'read:users' permission can access
}

// Controller method with role guard
@Post('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('Manager', 'Director')
async createUser() {
  // Only managers and directors can create users
}
```

### Scope Filtering

Services automatically apply team-based scope filtering:

```tsx
// Service method with scope filtering
async getCandidates(userId: string) {
  const scope = await this.rbacUtil.getEffectiveScope(userId);
  
  if (scope === 'all') {
    return this.prisma.candidate.findMany();
  }
  
  return this.prisma.candidate.findMany({
    where: { teamId: { in: scope.teamIds } }
  });
}
```

## Best Practices

### 1. Frontend UI Gating

```tsx
// ✅ Good: Use Can component for conditional rendering
<Can anyOf={["manage:users"]}>
  <Button onClick={handleAddUser}>Add User</Button>
</Can>

// ❌ Bad: Don't rely only on UI hiding
{user.permissions.includes("manage:users") && (
  <Button onClick={handleAddUser}>Add User</Button>
)}
```

### 2. Route Protection

```tsx
// ✅ Good: Use ProtectedRoute with permissions
<Route
  path="/admin"
  element={
    <ProtectedRoute permissions={["manage:all"]}>
      <AdminPage />
    </ProtectedRoute>
  }
/>
```

### 3. API Security

```tsx
// ✅ Good: Always enforce permissions on backend
@Post('users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Permissions('manage:users')
async createUser(@Body() dto: CreateUserDto) {
  // Business logic here
}
```

### 4. Permission Granularity

```tsx
// ✅ Good: Use specific permissions
<Can anyOf={["read:users"]}>
  <UserList />
</Can>

// ❌ Bad: Don't use overly broad permissions
<Can anyOf={["manage:all"]}>
  <UserList />
</Can>
```

## Testing

### Unit Tests

```tsx
import { render, screen } from '@testing-library/react';
import { Can } from '@/components/auth/Can';

test('renders content when user has permission', () => {
  // Mock user with permission
  const mockUser = { permissions: ['manage:users'] };
  
  render(
    <Can anyOf={['manage:users']}>
      <div>Admin Panel</div>
    </Can>
  );
  
  expect(screen.getByText('Admin Panel')).toBeInTheDocument();
});
```

### Integration Tests

```tsx
test('API endpoint enforces permissions', async () => {
  const response = await request(app)
    .get('/api/v1/users')
    .set('Authorization', `Bearer ${userToken}`); // User without read:users
  
  expect(response.status).toBe(403);
});
```

## Cache Invalidation

The system automatically handles permission cache invalidation:

- **Frontend**: `userVersion` changes trigger background revalidation
- **Backend**: 60-second cache with manual invalidation methods
- **Real-time**: Permissions update immediately after role changes

## Troubleshooting

### Common Issues

1. **Permission not working**: Check if user has the correct role assignment
2. **Cache issues**: Clear browser cache or wait for cache expiration
3. **API 403 errors**: Verify backend guards are properly configured
4. **UI not updating**: Check if `userVersion` is being updated correctly

### Debug Mode

Enable debug logging to troubleshoot permission issues:

```tsx
// Frontend debug
console.log('User permissions:', user.permissions);
console.log('Can manage users:', useCan(['manage:users']));

// Backend debug
console.log('User roles:', await rbacUtil.getUserRolesAndPermissions(userId));
```

## Security Considerations

1. **Never trust frontend-only checks**: Always enforce permissions on backend
2. **Use principle of least privilege**: Grant minimum required permissions
3. **Regular audits**: Review permission assignments periodically
4. **Secure defaults**: Default to deny, explicitly allow access
5. **Input validation**: Validate all permission-related inputs

## Migration Guide

When adding new permissions:

1. **Database**: Add permission to seed data
2. **Backend**: Create guard for new permission
3. **Frontend**: Update navigation and components
4. **Tests**: Add test coverage for new permission
5. **Documentation**: Update this guide with new permission
