import { baseApi } from "@/app/api/baseApi";

// ==================== RNR Settings Types ====================

export interface RNROfficeHours {
  enabled: boolean;
  start: string;
  end: string;
}

export interface RNRCreAssignment {
  enabled: boolean;
  afterDays: number;
  assignmentStrategy: "round_robin" | "load_balanced" | "manual";
  creRoleId: string | null;
  creTeamId: string | null;
}

export interface RNRSettingsData {
  totalDays: number;
  remindersPerDay: number;
  delayBetweenReminders: number;
  officeHours: RNROfficeHours;
  creAssignment: RNRCreAssignment;
}

export interface RNRSettingsResponse {
  statusCode: number;
  message: string;
  data: RNRSettingsData;
}

// ==================== HRD Settings Types ====================

export interface HRDOfficeHours {
  enabled: boolean;
  start: string;
  end: string;
}

export interface HRDEscalate {
  enabled: boolean;
  afterDays: number;
  assignmentStrategy: "round_robin" | "load_balanced" | "manual";
}

export interface HRDTestMode {
  enabled: boolean;
  immediateDelayMinutes: number;
}

export interface HRDSettingsData {
  daysAfterSubmission: number;
  remindersPerDay: number;
  dailyTimes: string[];
  totalDays: number;
  delayBetweenReminders: number;
  officeHours: HRDOfficeHours;
  escalate: HRDEscalate;
  testMode: HRDTestMode;
}

export interface HRDSettingsResponse {
  statusCode: number;
  message: string;
  data: HRDSettingsData;
}

// ==================== Update Request Types ====================

export type UpdateRNRSettingsRequest = Partial<RNRSettingsData>;
export type UpdateHRDSettingsRequest = Partial<HRDSettingsData>;

// ==================== API Endpoints ====================

export const systemSettingsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Get RNR Settings
    getRNRSettings: builder.query<RNRSettingsResponse, void>({
      query: () => ({
        url: "/system-config/rnr-settings",
        method: "GET",
      }),
      providesTags: ["SystemConfig"],
    }),

    // Update RNR Settings
    updateRNRSettings: builder.mutation<RNRSettingsResponse, UpdateRNRSettingsRequest>({
      query: (data) => ({
        url: "/system-config/rnr-settings",
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["SystemConfig"],
    }),

    // Get HRD Settings
    getHRDSettings: builder.query<HRDSettingsResponse, void>({
      query: () => ({
        url: "/system-config/hrd-settings",
        method: "GET",
      }),
      providesTags: ["SystemConfig"],
    }),

    // Update HRD Settings
    updateHRDSettings: builder.mutation<HRDSettingsResponse, UpdateHRDSettingsRequest>({
      query: (data) => ({
        url: "/system-config/hrd-settings",
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["SystemConfig"],
    }),
  }),
});

export const {
  useGetRNRSettingsQuery,
  useUpdateRNRSettingsMutation,
  useGetHRDSettingsQuery,
  useUpdateHRDSettingsMutation,
} = systemSettingsApi;
