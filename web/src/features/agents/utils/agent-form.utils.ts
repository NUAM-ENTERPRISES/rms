import type { AgentType } from "@/constants/agent-types";

export function getAgentOrganizationLabel(agentType: string): string {
  switch (agentType) {
    case "Agency":
      return "Agent Organization Name";
    case "Sub-Agent":
      return "Sub Agent Organization";
    default:
      return "Organization Name";
  }
}

export type AgentFormFields = {
  name: string;
  email: string;
  mobileNumber: string;
  whatsappNumber: string;
  alternatePhone1: string;
  alternatePhone2: string;
  countryCode: string;
  companyName: string;
  agentType: AgentType | "";
};

export const initialAgentFormFields: AgentFormFields = {
  name: "",
  email: "",
  mobileNumber: "",
  whatsappNumber: "",
  alternatePhone1: "",
  alternatePhone2: "",
  countryCode: "",
  companyName: "",
  agentType: "",
};

export function agentFormFieldsToPayload(form: AgentFormFields) {
  return {
    name: form.name.trim(),
    email: form.email.trim() || undefined,
    mobileNumber: form.mobileNumber.trim() || undefined,
    whatsappNumber: form.whatsappNumber.trim() || undefined,
    alternatePhone1: form.alternatePhone1.trim() || undefined,
    alternatePhone2: form.alternatePhone2.trim() || undefined,
    countryCode: form.countryCode.trim() || undefined,
    companyName: form.companyName.trim() || undefined,
    agentType: form.agentType.trim() || undefined,
  };
}
