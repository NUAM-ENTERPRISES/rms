export interface UserWithRoles {
  id: string;
  email: string;
  name: string;
  phone?: string;
  dateOfBirth?: Date;
  createdAt: Date;
  updatedAt: Date;
  userRoles: Array<{
    role: {
      id: string;
      name: string;
      description?: string;
    };
  }>;
}

export interface PaginatedUsers {
  users: UserWithRoles[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
