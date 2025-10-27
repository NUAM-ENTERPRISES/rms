# 📁 Navigation Structure - Refactored

## Overview

The navigation system has been refactored for better code organization and maintainability. Tab navigators are now separated into individual files for better readability.

## 🗂 New File Structure

```
src/navigation/
├── RoleBasedNavigator.tsx          # Main navigation logic
├── AppNavigator.tsx               # Original navigator (backup)
└── tabs/
    ├── index.ts                   # Export all tab navigators
    ├── RecruiterTabs.tsx          # Recruiter tab navigation
    ├── CEOTabs.tsx               # CEO tab navigation
    ├── ManagerTabs.tsx           # Manager tab navigation
    └── [Future tab files...]     # Other role-specific tabs
```

## 🎯 Benefits of Refactoring

### **1. Better Code Organization**
- Each role's navigation is in its own file
- Easier to find and modify specific role navigation
- Cleaner main RoleBasedNavigator file

### **2. Improved Maintainability**
- Adding new tabs for a role only requires editing one file
- Easy to customize icons, colors, and screens per role
- Reduced code duplication

### **3. Enhanced Readability**
- Main navigator focuses on role logic, not UI details
- Each tab file is focused and self-contained
- Clear separation of concerns

## 📝 How to Use the New Structure

### **Adding New Role Tabs**

1. **Create a new tab file:**
```typescript
// src/navigation/tabs/TeamHeadTabs.tsx
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
// ... imports

const TeamHeadTabs = () => (
  <Tab.Navigator>
    {/* Your tabs here */}
  </Tab.Navigator>
);

export default TeamHeadTabs;
```

2. **Export it in index.ts:**
```typescript
// src/navigation/tabs/index.ts
export { default as TeamHeadTabs } from './TeamHeadTabs';
```

3. **Import and use in RoleBasedNavigator:**
```typescript
// src/navigation/RoleBasedNavigator.tsx
import { RecruiterTabs, CEOTabs, ManagerTabs, TeamHeadTabs } from './tabs';

// In the switch statement:
case USER_ROLES.TEAM_HEAD:
  return <TeamHeadTabs />;
```

### **Modifying Existing Tabs**

To modify the Recruiter tabs, just edit `src/navigation/tabs/RecruiterTabs.tsx`:

```typescript
// Add a new tab
<Tab.Screen 
  name="Reports" 
  component={ReportsScreen}
  options={{ 
    title: 'Reports',
    tabBarIcon: ({ color, size }) => (
      <Icon name="chart-bar" size={size} color={color} />
    )
  }}
/>
```

## 🚀 Current Implementation

### **Active Tab Navigators:**
- ✅ **RecruiterTabs** - Complete with Dashboard, Candidates, Projects, Interviews, Profile
- ✅ **CEOTabs** - Dashboard, Projects, Analytics, Teams, Settings  
- ✅ **ManagerTabs** - Dashboard, Projects, Candidates, Teams, Profile

### **Fallback Roles:**
Currently using RecruiterTabs as fallback:
- Team Head
- Team Lead  
- Documentation Executive
- Processing Executive

### **Easy to Extend:**
You can create specific tab navigators for each role when needed.

## 🎨 Customization Examples

### **Role-Specific Colors:**
```typescript
// In CEOTabs.tsx
tabBarActiveTintColor: '#FF6B35', // CEO gets orange theme
tabBarInactiveTintColor: '#999',
```

### **Role-Specific Icons:**
```typescript
// Different icons per role
switch (route.name) {
  case 'Dashboard':
    iconName = primaryRole === 'CEO' ? 'crown' : 'view-dashboard';
    break;
}
```

### **Role-Specific Screens:**
```typescript
// CEO sees executive dashboard, recruiters see work dashboard
<Tab.Screen 
  name="Dashboard" 
  component={primaryRole === 'CEO' ? ExecutiveDashboard : RecruiterDashboard}
/>
```

## 🔄 Migration Complete

The refactoring is complete and the app is ready to use with the new structure:

1. **Login** → Role detection works as before
2. **Navigation** → Clean, modular tab system
3. **Extensibility** → Easy to add new role-specific navigation

The system is now more maintainable and ready for future enhancements! 🎉