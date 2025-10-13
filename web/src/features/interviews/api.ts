import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "@/services/baseQuery";

// Placeholder for interviews feature
// This will be implemented when interview functionality is needed

export const interviewsApi = createApi({
  reducerPath: "interviewsApi",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["Interview"],
  endpoints: (builder) => ({
    // Placeholder endpoints - to be implemented
  }),
});

export const {} = interviewsApi;
