import { createApi } from '@reduxjs/toolkit/query/react'
import { baseQuery } from '@/services/baseApi'

interface User {
  id: string
  name: string
  email: string
  role: string
  teamId?: string
  dateOfBirth?: string
  phone?: string
  createdAt: string
  updatedAt: string
}

interface CreateUserRequest {
  name: string
  email: string
  password: string
  roleId: string
  teamId?: string
  dateOfBirth?: string
  phone?: string
}

interface UpdateUserRequest {
  id: string
  name?: string
  email?: string
  roleId?: string
  teamId?: string
  dateOfBirth?: string
  phone?: string
}

export const usersApi = createApi({
  reducerPath: 'usersApi',
  baseQuery,
  tagTypes: ['User'],
  endpoints: (builder) => ({
    getUsers: builder.query<User[], void>({
      query: () => '/users',
      providesTags: ['User'],
    }),
    getUserById: builder.query<User, string>({
      query: (id) => `/users/${id}`,
      providesTags: (_, __, id) => [{ type: 'User', id }],
    }),
    createUser: builder.mutation<User, CreateUserRequest>({
      query: (userData) => ({
        url: '/users',
        method: 'POST',
        body: userData,
      }),
      invalidatesTags: ['User'],
    }),
    updateUser: builder.mutation<User, UpdateUserRequest>({
      query: ({ id, ...userData }) => ({
        url: `/users/${id}`,
        method: 'PATCH',
        body: userData,
      }),
      invalidatesTags: (_, __, { id }) => [{ type: 'User', id }, 'User'],
    }),
    deleteUser: builder.mutation<void, string>({
      query: (id) => ({
        url: `/users/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['User'],
    }),
  }),
})

export const {
  useGetUsersQuery,
  useGetUserByIdQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useDeleteUserMutation,
} = usersApi
