import { baseApi } from "@/app/api/baseApi";

export type LeadAssignedRecruiter = {
  name: string;
  email: string;
  phone?: string;
};

export type SubmitLeadSuccessResponse = {
  message: string;
  candidateId: string;
  assignedRecruiter?: LeadAssignedRecruiter;
};

export type AlreadyRegisteredError = {
  code: "ALREADY_REGISTERED";
  message: string;
  candidateId: string;
  assignedRecruiter?: LeadAssignedRecruiter;
};

export const metaApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    verifyLead: builder.query<{ platform: string; senderId: string }, string>({
      query: (shortCode) => `/meta/webhook/verify/${shortCode}`,
    }),
    submitLead: builder.mutation<
      SubmitLeadSuccessResponse,
      { shortCode: string; data: any }
    >({
      query: ({ shortCode, data }) => ({
        url: `/meta/webhook/submit/${shortCode}`,
        method: "POST",
        body: data,
      }),
    }),
  }),
});

export const { useVerifyLeadQuery, useSubmitLeadMutation } = metaApi;
