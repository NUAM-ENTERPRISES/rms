import { baseApi } from "@/app/api/baseApi";

// Interview interfaces
export interface Interview {
  id: string;
  scheduledTime: string;
  duration: number;
  type: string;
  mode: string;
  meetingLink?: string;
  interviewer?: string;
  interviewerEmail?: string;
  outcome?: string;
  notes?: string;
  candidateProjectMap?: {
    id: string;
    candidate: {
      id: string;
      firstName: string;
      lastName: string;
      email?: string;
    };
    project: {
      id: string;
      title: string;
    };
  };
  project?: {
    id: string;
    title: string;
  };
}

export interface CreateInterviewRequest {
  candidateProjectMapId?: string;
  projectId?: string;
  scheduledTime: string;
  duration?: number;
  type?: string;
  mode?: string;
  meetingLink?: string;
  interviewerEmail?: string;
  notes?: string;
}

export interface UpdateInterviewRequest {
  scheduledTime?: string;
  duration?: number;
  type?: string;
  mode?: string;
  meetingLink?: string;
  interviewerEmail?: string;
  outcome?: string;
  notes?: string;
}

export interface QueryInterviewsRequest {
  search?: string;
  type?: string;
  mode?: string;
  status?: string;
  projectId?: string;
  candidateId?: string;
  page?: number;
  limit?: number;
}

// Interview API endpoints
export const interviewsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getInterviews: builder.query<
      { success: boolean; data: { interviews: Interview[]; pagination: any } },
      QueryInterviewsRequest
    >({
      query: (params) => ({
        url: "/interviews",
        params,
      }),
      providesTags: ["Interview"],
    }),

    getInterview: builder.query<{ success: boolean; data: Interview }, string>({
      query: (id) => `/interviews/${id}`,
      providesTags: (result, error, id) => [{ type: "Interview", id }],
    }),

    createInterview: builder.mutation<
      { success: boolean; data: Interview; message: string },
      CreateInterviewRequest
    >({
      query: (body) => ({
        url: "/interviews",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Interview"],
    }),

    updateInterview: builder.mutation<
      { success: boolean; data: Interview; message: string },
      { id: string; data: UpdateInterviewRequest }
    >({
      query: ({ id, data }) => ({
        url: `/interviews/${id}`,
        method: "PATCH",
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "Interview", id },
        "Interview",
      ],
    }),

    deleteInterview: builder.mutation<
      { success: boolean; message: string },
      string
    >({
      query: (id) => ({
        url: `/interviews/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, id) => [
        { type: "Interview", id },
        "Interview",
      ],
    }),
  }),
});

export const {
  useGetInterviewsQuery,
  useGetInterviewQuery,
  useCreateInterviewMutation,
  useUpdateInterviewMutation,
  useDeleteInterviewMutation,
} = interviewsApi;
