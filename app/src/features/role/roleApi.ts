import { baseApi } from '../../api/baseApi';
import { Role } from './roleTypes';

export const roleApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getRoles: builder.query<{ success: boolean; data: Role[] }, void>({
      query: () => '/roles',
      providesTags: ['Role'],
    }),
  }),
});

export const { useGetRolesQuery } = roleApi;
