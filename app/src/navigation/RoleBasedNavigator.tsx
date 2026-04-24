import React, { useMemo } from 'react';
import { useAppSelector } from '@/store/hooks';
import { selectPrimaryRole } from '@/features/auth/authSlice';

// Import tab navigators
import { RecruiterTabs, CEOTabs, ManagerTabs } from './tabs';

/**
 * Role-to-Component Registry
 * Professional pattern for scalable navigation management.
 * Maps priority-sorted roles to their respective Tab Navigators.
 */
const TAB_REGISTRY: Record<string, React.ComponentType> = {
  CEO: CEOTabs,
  Director: CEOTabs,
  Manager: ManagerTabs,
  Recruiter: RecruiterTabs,
  'Team Head': RecruiterTabs,
  'Team Lead': RecruiterTabs,
  'Documentation Executive': RecruiterTabs,
  'Processing Executive': RecruiterTabs,
  CRE: RecruiterTabs,
};

/**
 * RoleBasedNavigator Component - Professional Registry Implementation
 * 
 * Single Responsibility: Route authenticated user to appropriate tab navigator based on role
 * Uses a registry pattern instead of a switch/if-else for O(1) lookup and OCP compliance.
 */
const RoleBasedNavigator = () => {
    
  // Get primary role using hierarchy selector
  const primaryRole = useAppSelector(selectPrimaryRole);

  // Memoize the selected component to prevent unnecessary re-renders
  const TargetTabs = useMemo(() => {
    if (!primaryRole) return RecruiterTabs;
    
    console.log(`👤 Identifying navigator for: ${primaryRole}`);
    
    // O(1) Registry Lookup
    return TAB_REGISTRY[primaryRole] || RecruiterTabs;
  }, [primaryRole]);

  return <TargetTabs />;
};

export default RoleBasedNavigator;


