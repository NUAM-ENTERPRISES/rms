import React from 'react';
import { useAppSelector } from '@/store/hooks';

// Import tab navigators
import { RecruiterTabs, CEOTabs, ManagerTabs } from './tabs';

// Define role constants based on your system
export const USER_ROLES = {
  CEO: 'CEO',
  DIRECTOR: 'DIRECTOR',
  MANAGER: 'MANAGER',
  TEAM_HEAD: 'TEAM_HEAD',
  TEAM_LEAD: 'TEAM_LEAD',
  RECRUITER: 'RECRUITER',
  DOCUMENTATION_EXECUTIVE: 'DOCUMENTATION_EXECUTIVE',
  PROCESSING_EXECUTIVE: 'PROCESSING_EXECUTIVE',
} as const;

/**
 * RoleBasedNavigator Component - Clean & Professional
 * 
 * Single Responsibility: Route authenticated user to appropriate tab navigator based on role
 * 
 * Prerequisites:
 * - User is already authenticated (handled by AuthNavigator)
 * - User data and roles are available
 * - No loading or splash states needed here
 */
const RoleBasedNavigator = () => {
    
  const { user } = useAppSelector((state) => state.auth);

  /**
   * Get the primary role from user's roles array
   * Uses hierarchy: CEO > DIRECTOR > MANAGER > TEAM_HEAD > TEAM_LEAD > RECRUITER > Others
   */
  const getPrimaryRole = (): string => {
    if (!user?.roles || !Array.isArray(user.roles) || user.roles.length === 0) {
      console.log('⚠️ No roles found for user, defaulting to recruiter');
      return USER_ROLES.RECRUITER;
    }

    const roleHierarchy = [
      USER_ROLES.CEO,
      USER_ROLES.DIRECTOR,
      USER_ROLES.MANAGER,
      USER_ROLES.TEAM_HEAD,
      USER_ROLES.TEAM_LEAD,
      USER_ROLES.RECRUITER,
      USER_ROLES.DOCUMENTATION_EXECUTIVE,
      USER_ROLES.PROCESSING_EXECUTIVE,
    ];

    // Find the highest priority role user has
    for (const role of roleHierarchy) {
      if (user.roles.includes(role)) {
        console.log(`👤 Primary role assigned: ${role}`);
        return role;
      }
    }

    console.log(`⚠️ No matching roles found, defaulting to recruiter`);
    return USER_ROLES.RECRUITER; // Default fallback
  };

  // Get primary role for navigation
  const primaryRole = getPrimaryRole();

  // Route to appropriate tab navigator based on role
  switch (primaryRole) {
    case USER_ROLES.CEO:
    case USER_ROLES.DIRECTOR:
      console.log(`🎯 Rendering CEO/Director tabs for role: ${primaryRole}`);
      return <CEOTabs />;
    
    case USER_ROLES.MANAGER:
      console.log(`🎯 Rendering Manager tabs for role: ${primaryRole}`);
      return <ManagerTabs />;
    
    case USER_ROLES.RECRUITER:
      console.log(`🎯 Rendering Recruiter tabs for role: ${primaryRole}`);
      return <RecruiterTabs />;
    
    // For roles without specific tab navigators yet, use RecruiterTabs as fallback
    case USER_ROLES.TEAM_HEAD:
    case USER_ROLES.TEAM_LEAD:
    case USER_ROLES.DOCUMENTATION_EXECUTIVE:
    case USER_ROLES.PROCESSING_EXECUTIVE:
    default:
      console.log(`🎯 Rendering default (Recruiter) tabs for role: ${primaryRole}`);
      return <RecruiterTabs />; // You can create specific tabs for these roles later
  }
};

export default RoleBasedNavigator;


