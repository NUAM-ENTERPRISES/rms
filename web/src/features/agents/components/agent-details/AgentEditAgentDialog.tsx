import { useState, useEffect, type FormEvent } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useUpdateAgentMutation, type Agent } from "../../api";
import { AgentFormFieldsSection } from "../AgentFormFields";
import {
  agentFormFieldsToPayload,
  initialAgentFormFields,
  type AgentFormFields,
} from "../../utils/agent-form.utils";

export type AgentEditFormState = AgentFormFields & {
  isActive: boolean;
};

function emptyForm(): AgentEditFormState {
  return {
    ...initialAgentFormFields,
    isActive: true,
  };
}

type AgentEditAgentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agentId: string;
  agent: Agent | undefined;
};

export function AgentEditAgentDialog({ open, onOpenChange, agentId, agent }: AgentEditAgentDialogProps) {
  const [form, setForm] = useState<AgentEditFormState>(emptyForm);
  const [updateAgent, { isLoading: isUpdating }] = useUpdateAgentMutation();

  useEffect(() => {
    if (open && agent) {
      setForm({
        name: agent.name,
        email: agent.email ?? "",
        mobileNumber: agent.mobileNumber ?? "",
        whatsappNumber: agent.whatsappNumber ?? "",
        alternatePhone1: agent.alternatePhone1 ?? "",
        alternatePhone2: agent.alternatePhone2 ?? "",
        countryCode: agent.countryCode ?? agent.country?.code ?? "",
        companyName: agent.companyName ?? "",
        agentType: (agent.agentType ?? "") as AgentFormFields["agentType"],
        isActive: agent.isActive,
      });
    }
  }, [open, agent]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Agent name is required");
      return;
    }
    try {
      await updateAgent({
        id: agentId,
        body: {
          ...agentFormFieldsToPayload(form),
          isActive: form.isActive,
        },
      }).unwrap();
      toast.success("Agent updated successfully");
      onOpenChange(false);
    } catch {
      toast.error("Failed to update agent");
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) setForm(emptyForm());
      }}
    >
      <DialogContent className="sm:max-w-3xl w-[calc(100vw-2rem)] max-h-[85vh] overflow-y-auto gap-3 p-6" aria-describedby="edit-agent-description">
        <DialogHeader className="space-y-1 pb-0">
          <DialogTitle className="text-lg">Edit agent</DialogTitle>
          <DialogDescription id="edit-agent-description" className="text-sm">
            Update this partner agent&apos;s profile. Changes apply immediately.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3 pt-1">
          <AgentFormFieldsSection
            idPrefix="edit-agent"
            form={form}
            onChange={(updates) => setForm((f) => ({ ...f, ...updates }))}
          />
          <div className="flex items-center justify-between gap-4 rounded-lg border border-border px-3 py-2 sm:col-span-2">
            <div className="space-y-0.5">
              <Label htmlFor="edit-agent-active" className="text-sm font-medium">
                Active partner
              </Label>
              <p className="text-xs text-muted-foreground">
                Inactive agents stay in the system but can be hidden from active lists.
              </p>
            </div>
            <Switch
              id="edit-agent-active"
              checked={form.isActive}
              onCheckedChange={(checked) => setForm((f) => ({ ...f, isActive: checked }))}
              aria-label="Agent is active"
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isUpdating}>
              Cancel
            </Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isUpdating}>
              {isUpdating ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
