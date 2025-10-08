import { useMemo } from "react";

// Mock user data - in real implementation, this would come from an API
const mockUsers = [
  {
    id: "550e8400-e29b-41d4-a716-446655440001",
    name: "Sarah Johnson",
    email: "sarah@affiniks.com",
    role: "Manager",
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440002",
    name: "Mike Chen",
    email: "mike@affiniks.com",
    role: "Senior Recruiter",
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440003",
    name: "Emma Davis",
    email: "emma@affiniks.com",
    role: "Recruiter",
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440004",
    name: "Alex Rodriguez",
    email: "alex@affiniks.com",
    role: "Team Lead",
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440005",
    name: "Jennifer Lee",
    email: "jennifer@affiniks.com",
    role: "Senior Manager",
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440006",
    name: "David Wilson",
    email: "david@affiniks.com",
    role: "Director",
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440007",
    name: "Lisa Wang",
    email: "lisa@affiniks.com",
    role: "Senior Recruiter",
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440008",
    name: "Robert Brown",
    email: "robert@affiniks.com",
    role: "Manager",
  },
];

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

export const useUsersLookup = () => {
  const users = useMemo(() => mockUsers, []);

  const getUserById = (id: string): User | undefined => {
    return users.find((user) => user.id === id);
  };

  const getUsersByRole = (role: string): User[] => {
    return users.filter((user) =>
      user.role.toLowerCase().includes(role.toLowerCase())
    );
  };

  const getLeadershipUsers = (): User[] => {
    return users.filter(
      (user) =>
        user.role.toLowerCase().includes("manager") ||
        user.role.toLowerCase().includes("lead") ||
        user.role.toLowerCase().includes("director")
    );
  };

  return {
    users,
    getUserById,
    getUsersByRole,
    getLeadershipUsers,
  };
};
