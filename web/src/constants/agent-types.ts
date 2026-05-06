export const AGENT_TYPES = [
  'Freelancer',
  'Agency',
  'Sub-Agent',
  'International Partner',
] as const;

export type AgentType = (typeof AGENT_TYPES)[number];
