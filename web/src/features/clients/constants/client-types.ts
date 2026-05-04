export const CLIENT_TYPES = [
  "DIRECT_CLIENT",
  "SUB_AGENT",
  "FREELANCE",
] as const;

export type ClientTypeValue = (typeof CLIENT_TYPES)[number];

export const CLIENT_TYPE_LABELS: Record<ClientTypeValue, string> = {
  DIRECT_CLIENT: "Direct client",
  SUB_AGENT: "Sub Agent",
  FREELANCE: "Freelance",
};
