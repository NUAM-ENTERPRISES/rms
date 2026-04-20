export interface Role {
  id: string;
  name: string;
  displayName?: string;
  description?: string;
  permissions?: string[];
}

export interface RoleState {
  roles: Role[];
  isLoading: boolean;
  error: string | null;
}
