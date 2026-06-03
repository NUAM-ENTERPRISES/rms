import type { ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CountrySelect } from "@/components/molecules";
import { AGENT_TYPES } from "@/constants/agent-types";
import {
  getAgentOrganizationLabel,
  type AgentFormFields,
} from "../utils/agent-form.utils";

type AgentFormFieldsProps = {
  form: AgentFormFields;
  onChange: (updates: Partial<AgentFormFields>) => void;
  idPrefix: string;
};

function FieldGroup({
  id,
  label,
  required,
  children,
  className,
}: {
  id: string;
  label: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`space-y-1.5 ${className ?? ""}`}>
      <Label htmlFor={id} className="text-sm">
        {label}
        {required ? " *" : ""}
      </Label>
      {children}
    </div>
  );
}

export function AgentFormFieldsSection({
  form,
  onChange,
  idPrefix,
}: AgentFormFieldsProps) {
  const orgLabel = getAgentOrganizationLabel(form.agentType);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
      <FieldGroup id={`${idPrefix}-name`} label="Agent Name" required>
        <Input
          id={`${idPrefix}-name`}
          required
          value={form.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="Full name of agent"
          autoComplete="name"
          className="h-9"
        />
      </FieldGroup>

      <FieldGroup id={`${idPrefix}-type`} label="Agency Type">
        <Select
          value={form.agentType || undefined}
          onValueChange={(value) => onChange({ agentType: value as AgentFormFields["agentType"] })}
        >
          <SelectTrigger id={`${idPrefix}-type`} className="h-9 w-full">
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent>
            {AGENT_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FieldGroup>

      <FieldGroup id={`${idPrefix}-company`} label={orgLabel} className="sm:col-span-2">
        <Input
          id={`${idPrefix}-company`}
          value={form.companyName}
          onChange={(e) => onChange({ companyName: e.target.value })}
          placeholder="e.g. Ace Recruitment Ltd"
          autoComplete="organization"
          className="h-9"
        />
      </FieldGroup>

      <FieldGroup id={`${idPrefix}-country`} label="Country">
        <CountrySelect
          value={form.countryCode || undefined}
          onValueChange={(value) => onChange({ countryCode: value ?? "" })}
          placeholder="Select country"
        />
      </FieldGroup>

      <FieldGroup id={`${idPrefix}-email`} label="Email Address">
        <Input
          id={`${idPrefix}-email`}
          type="email"
          value={form.email}
          onChange={(e) => onChange({ email: e.target.value })}
          placeholder="agent@example.com"
          autoComplete="email"
          className="h-9"
        />
      </FieldGroup>

      <FieldGroup id={`${idPrefix}-mobile`} label="Mobile Number">
        <Input
          id={`${idPrefix}-mobile`}
          value={form.mobileNumber}
          onChange={(e) => onChange({ mobileNumber: e.target.value })}
          placeholder="+91 9876543210"
          autoComplete="tel"
          className="h-9"
        />
      </FieldGroup>

      <FieldGroup id={`${idPrefix}-whatsapp`} label="WhatsApp Number">
        <Input
          id={`${idPrefix}-whatsapp`}
          value={form.whatsappNumber}
          onChange={(e) => onChange({ whatsappNumber: e.target.value })}
          placeholder="+91 9876543210"
          autoComplete="tel"
          className="h-9"
        />
      </FieldGroup>

      <FieldGroup id={`${idPrefix}-alt-phone-1`} label="Alternate Phone 1">
        <Input
          id={`${idPrefix}-alt-phone-1`}
          value={form.alternatePhone1}
          onChange={(e) => onChange({ alternatePhone1: e.target.value })}
          placeholder="+91 9876543210"
          autoComplete="tel"
          className="h-9"
        />
      </FieldGroup>

      <FieldGroup id={`${idPrefix}-alt-phone-2`} label="Alternate Phone 2">
        <Input
          id={`${idPrefix}-alt-phone-2`}
          value={form.alternatePhone2}
          onChange={(e) => onChange({ alternatePhone2: e.target.value })}
          placeholder="+91 9876543210"
          autoComplete="tel"
          className="h-9"
        />
      </FieldGroup>
    </div>
  );
}
