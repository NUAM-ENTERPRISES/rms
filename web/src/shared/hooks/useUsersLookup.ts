import { useMemo } from "react";
import { useGetUsersQuery } from "@/features/admin";

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

export const useUsersLookup = () => {
  const { data: usersResponse, isLoading, error } = useGetUsersQuery();

  // Extract users from API response
  const users = useMemo(() => {
    if (!usersResponse?.data?.users) return [];
    return usersResponse.data.users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.userRoles?.[0]?.role?.name || "Unknown", // Get first role name
    }));
  }, [usersResponse]);

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
    isLoading,
    error,
  };
};
