import { LucideIcon, Home, Users, UserCheck, Building2, FileText, Settings, BarChart3, Shield } from 'lucide-react';

export interface NavItem {
  id: string;
  label: string;
  path?: string;
  icon?: LucideIcon;
  roles?: string[];
  permissions?: string[];
  featureFlag?: string;
  badge?: {
    text: string;
    variant?: 'default' | 'secondary' | 'destructive' | 'outline';
  };
  children?: NavItem[];
  disabled?: boolean;
}

export const navigationConfig: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    path: '/dashboard',
    icon: Home,
    permissions: ['read:dashboard'],
  },
  {
    id: 'projects',
    label: 'Projects',
    path: '/projects',
    icon: Building2,
    permissions: ['read:projects'],
  },
  {
    id: 'candidates',
    label: 'Candidates',
    path: '/candidates',
    icon: UserCheck,
    permissions: ['read:candidates'],
  },
  {
    id: 'teams',
    label: 'Teams',
    path: '/teams',
    icon: Users,
    permissions: ['read:teams'],
  },
  {
    id: 'clients',
    label: 'Clients',
    path: '/clients',
    icon: Building2,
    permissions: ['read:clients'],
  },
  {
    id: 'documents',
    label: 'Documents',
    path: '/documents',
    icon: FileText,
    permissions: ['read:documents'],
  },
  {
    id: 'analytics',
    label: 'Analytics',
    path: '/analytics',
    icon: BarChart3,
    permissions: ['read:analytics'],
  },
  {
    id: 'admin',
    label: 'Administration',
    icon: Shield,
    roles: ['CEO', 'Director', 'Manager'],
    children: [
      {
        id: 'admin-users',
        label: 'Users',
        path: '/admin/users',
        permissions: ['read:users'],
      },
      {
        id: 'admin-roles',
        label: 'Roles & Permissions',
        path: '/admin/roles',
        permissions: ['read:roles'],
      },
      {
        id: 'admin-teams',
        label: 'Team Management',
        path: '/admin/teams',
        permissions: ['read:teams'],
      },
    ],
  },
  {
    id: 'settings',
    label: 'Settings',
    path: '/settings',
    icon: Settings,
    permissions: ['read:settings'],
  },
];

export default navigationConfig;
