# Role-Based Navigation System

## Overview

This React Native app now includes a comprehensive role-based navigation system that automatically shows different screens and navigation tabs based on the user's role after login.

## How It Works

### 1. **Role Detection**
- After successful login, the user's roles are fetched from the backend `/auth/me` endpoint
- The system automatically determines the primary role using a hierarchy system
- Role hierarchy (highest to lowest):
  - CEO/Director
  - Manager  
  - Team Head
  - Team Lead
  - Recruiter
  - Documentation Executive
  - Processing Executive

### 2. **Role-Based Navigation**
Each role gets a customized bottom tab navigation with relevant screens:

#### **Recruiter** (Your main focus)
- **Dashboard**: Overview of assigned candidates, tasks, and activities
- **Candidates**: Manage assigned candidates
- **Projects**: View available projects for nomination
- **Interviews**: Schedule and manage interviews
- **Profile**: User profile and logout

#### **CEO/Director**
- Dashboard, Projects, Analytics, Teams, Settings

#### **Manager**  
- Dashboard, Projects, Candidates, Teams, Profile

#### **Team Head**
- Dashboard, Projects, Candidates, Team, Profile

#### **Team Lead**
- Dashboard, Tasks, Candidates, Reports, Profile

#### **Documentation Executive**
- Dashboard, Documents, Verification, Queue, Profile

#### **Processing Executive**
- Dashboard, Processing, Candidates, Status, Profile

### 3. **Key Features**

#### **Recruiter Dashboard** (Main Screen)
- **Stats Cards**: Shows total candidates, pending documents, interviews, approved
- **Quick Actions**: Add candidate, view projects, schedule interview
- **Today's Tasks**: Priority-based task list with due times
- **My Candidates**: List of assigned candidates with status badges
- **Recent Activities**: Real-time activity feed
- **Pull to Refresh**: Refresh data

#### **Permission-Based Access Control**
```typescript
// Example usage in components
const { user, hasPermission, hasRole } = useUserProfile();

// Check specific permissions
if (hasPermission('read:candidates')) {
  // Show candidates section
}

// Check roles
if (hasRole('RECRUITER')) {
  // Show recruiter-specific UI
}
```

## Usage Examples

### 1. **Login Flow**
```typescript
// User logs in → API returns user data with roles
{
  "success": true,
  "data": {
    "id": "user123",
    "name": "John Recruiter", 
    "email": "john@company.com",
    "roles": ["RECRUITER"],
    "permissions": ["read:candidates", "write:candidates", ...]
  }
}

// System automatically shows RecruiterTabs navigation
```

### 2. **Testing the System**
1. **Login as recruiter** → Should see RecruiterTabs with Dashboard, Candidates, Projects, Interviews, Profile
2. **Login as CEO** → Should see CEOTabs with Dashboard, Projects, Analytics, Teams, Settings
3. **Check permissions** → Each role should only see relevant features
4. **Test navigation** → Tabs should work and show appropriate screens

## File Structure

```
src/
├── navigation/
│   └── RoleBasedNavigator.tsx     # Main navigation logic
├── screens/
│   ├── roles/
│   │   ├── RecruiterDashboard.tsx # Recruiter main screen
│   │   ├── CEODashboard.tsx       # CEO main screen
│   │   └── RoleDashboards.tsx     # Other role screens
│   └── shared/
│       ├── CandidatesScreen.tsx   # Shared candidate management
│       ├── ProjectsScreen.tsx     # Shared project management
│       ├── ProfileScreen.tsx      # User profile & logout
│       └── ...
└── features/auth/
    ├── useUserProfile.ts          # Role/permission hook
    ├── authApi.ts                 # Authentication API
    └── authTypes.ts               # Type definitions
```

The system is now ready for you to test with recruiter login and see the role-specific dashboard!