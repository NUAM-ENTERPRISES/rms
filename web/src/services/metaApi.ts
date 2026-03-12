import { baseApi } from "@/app/api/baseApi";

export const metaApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    verifyLead: builder.query<{ platform: string; senderId: string }, string>({
      query: (shortCode) => `/meta/webhook/verify/${shortCode}`,
    }),
    submitLead: builder.mutation<any, { shortCode: string; data: any }>({
      query: ({ shortCode, data }) => ({
        url: `/meta/webhook/submit/${shortCode}`,
        method: "POST",
        body: data,
      }),
    }),
  }),
});

export const { useVerifyLeadQuery, useSubmitLeadMutation } = metaApi;
