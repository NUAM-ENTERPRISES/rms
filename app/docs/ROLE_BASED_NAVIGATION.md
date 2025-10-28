# Role-Based Navigation System

This guide explains how to implement and use the role-based navigation system in your React Native app.

## 🏗️ System Architecture

The role-based system consists of several key components:

1. **RoleBasedAccess Hook** - Provides role and permission checking utilities
2. **AppNavigator** - Main navigation component that routes users based on their roles
3. **Role-Specific Dashboards** - Different screens for different user types
4. **Permission-Based Components** - Components that show/hide based on permissions

## 🚀 How It Works

### 1. User Authentication & Role Detection

When a user logs in, the system:
- Stores user data including roles and permissions in Redux
- The `AppNavigator` reads the user's roles from Redux state
- Determines the primary role using role hierarchy (CEO > Manager > Team Head > etc.)
- Routes to appropriate dashboard based on the primary role

### 2. Role Hierarchy

```
CEO/DIRECTOR (Highest)
├── MANAGER
│   ├── TEAM_HEAD
│   │   ├── TEAM_LEAD
│   │   │   ├── RECRUITER
│   │   │   ├── DOCUMENTATION_EXECUTIVE
│   │   │   └── PROCESSING_EXECUTIVE
```

### 3. Navigation Structure

```
AppNavigator
├── Authentication Flow
│   ├── SplashScreen (Loading)
│   └── LoginScreen (Not authenticated)
│
└── Role-Based Flow (Authenticated)
    ├── RecruiterTabs (RECRUITER role)
    │   ├── Dashboard (RecruiterDashboard)
    │   ├── Candidates
    │   ├── Projects
    │   └── Profile
    │
    ├── ManagerTabs (MANAGER role) [Future]
    ├── CEOTabs (CEO role) [Future]
    └── ... (Other roles)
```

## 🔧 Implementation Examples

### 1. Using the Role-Based Access Hook

```typescript
import { useRoleBasedAccess } from '@/hooks/useRoleBasedAccess';

const MyComponent = () => {
  const {
    user,
    hasRole,
    hasPermission,
    canManageCandidates,
    ROLES,
    PERMISSIONS
  } = useRoleBasedAccess();

  // Check specific role
  if (hasRole(ROLES.RECRUITER)) {
    // Show recruiter-specific content
  }

  // Check specific permission
  if (hasPermission(PERMISSIONS.MANAGE_CANDIDATES)) {
    // Show candidate management features
  }

  // Check capability
  if (canManageCandidates()) {
    // Show candidate management UI
  }
};
```

### 2. Conditional Rendering Based on Roles

```typescript
const Dashboard = () => {
  const { hasRole, hasPermission, ROLES, PERMISSIONS } = useRoleBasedAccess();

  return (
    <View>
      {/* Always visible */}
      <Text>Welcome to Dashboard</Text>

      {/* Only for Recruiters */}
      {hasRole(ROLES.RECRUITER) && (
        <RecruiterSection />
      )}

      {/* Only for Managers and above */}
      {hasAnyRole([ROLES.CEO, ROLES.MANAGER]) && (
        <ManagementSection />
      )}

      {/* Permission-based */}
      {hasPermission(PERMISSIONS.MANAGE_CANDIDATES) && (
        <CandidateManagement />
      )}
    </View>
  );
};
```

### 3. Creating Role-Specific Screens

```typescript
// RecruiterDashboard.tsx
const RecruiterDashboard = () => {
  const { hasPermission, PERMISSIONS } = useRoleBasedAccess();

  // Check access
  if (!hasPermission(PERMISSIONS.READ_CANDIDATES)) {
    return <AccessDeniedScreen />;
  }

  return (
    <View>
      {/* Recruiter-specific dashboard content */}
      <RecruiterStats />
      <CandidatesList />
      <RecentActivities />
    </View>
  );
};
```

## 📱 Navigation Configuration

### Current Navigation Structure (AppNavigator.tsx)

The `AppNavigator` automatically:
1. Shows `SplashScreen` while loading user data
2. Shows `LoginScreen` if user is not authenticated
3. Routes to role-specific tabs based on user's primary role

### Adding New Role Navigation

To add navigation for a new role:

1. **Create the dashboard component:**
```typescript
// src/screens/roles/ManagerDashboard.tsx
const ManagerDashboard = () => {
  // Manager-specific logic
  return <ManagerContent />;
};
```

2. **Create tab navigation:**
```typescript
const ManagerTabs = () => (
  <Tab.Navigator>
    <Tab.Screen name="Dashboard" component={ManagerDashboard} />
    <Tab.Screen name="Teams" component={TeamsScreen} />
    <Tab.Screen name="Analytics" component={AnalyticsScreen} />
  </Tab.Navigator>
);
```

3. **Add to RoleBasedNavigator:**
```typescript
switch (primaryRole) {
  case 'MANAGER':
    return <ManagerTabs />;
  case 'RECRUITER':
    return <RecruiterTabs />;
  // ... other roles
}
```

## 🔐 Permission System

### Available Permissions

Based on your system workflow, the following permissions are available:

**General:**
- `read:all`, `write:all`, `manage:all`

**Candidates:**
- `read:candidates`, `write:candidates`, `manage:candidates`
- `nominate:candidates`, `approve:candidates`, `reject:candidates`

**Documents:**
- `read:documents`, `write:documents`, `verify:documents`, `manage:documents`

**Interviews:**
- `read:interviews`, `write:interviews`, `manage:interviews`, `schedule:interviews`

**Projects:**
- `read:projects`, `write:projects`, `manage:projects`

### Permission Checking Examples

```typescript
const { hasPermission, hasAnyPermission } = useRoleBasedAccess();

// Single permission
if (hasPermission('manage:candidates')) {
  // Show candidate management
}

// Multiple permissions (user needs ANY of these)
if (hasAnyPermission(['read:candidates', 'manage:candidates'])) {
  // Show candidate list
}
```

## 🎯 Role-Specific Features

### Recruiter Features
- View assigned candidates
- Nominate candidates to projects
- Schedule interviews
- Upload and manage documents
- Track candidate progress

### Documentation Executive Features
- Verify submitted documents
- Approve/reject document submissions
- Request document resubmission
- Track verification queue

### Manager Features
- Team overview and analytics
- User management
- Project management
- Performance monitoring

### CEO Features
- System-wide analytics
- Strategic oversight
- Configuration management
- All system access

## 🚀 Getting Started

1. **Login with a user that has appropriate roles**
2. **The system automatically routes to the appropriate dashboard**
3. **Use role-based hooks in components to show/hide features**

### Example User Response from API:

```json
{
  "success": true,
  "data": {
    "id": "user123",
    "name": "John Doe",
    "email": "john@example.com",
    "roles": ["RECRUITER"],
    "permissions": [
      "read:candidates",
      "write:candidates",
      "nominate:candidates",
      "schedule:interviews"
    ]
  }
}
```

This user will:
- Be routed to `RecruiterTabs` navigation
- Have access to candidate management features
- Be able to schedule interviews
- NOT have access to document verification (no `verify:documents` permission)

## 📝 Best Practices

1. **Always check permissions before showing UI elements**
2. **Use the role hierarchy to determine primary role**
3. **Provide fallback/error screens for access denied scenarios**
4. **Keep role and permission constants centralized**
5. **Test with different user roles to ensure proper access control**

## 🔍 Debugging

To debug role-based access issues:

1. Check user data in Redux DevTools
2. Verify roles and permissions in user object
3. Use console.log in role checking functions
4. Test with different user accounts

```typescript
const { user, getPrimaryRole } = useRoleBasedAccess();
console.log('User roles:', user?.roles);
console.log('User permissions:', user?.permissions);
console.log('Primary role:', getPrimaryRole());
```

## 🔄 Future Enhancements

1. **Dynamic role assignment** - Allow runtime role changes
2. **Team-based permissions** - Scope permissions to specific teams
3. **Time-based access** - Temporary role assignments
4. **Audit logging** - Track role-based access attempts
5. **Advanced navigation** - Nested role-specific navigation

---

This system provides a flexible, scalable approach to role-based access control in your React Native application, ensuring users only see and can access features appropriate to their role and permissions.