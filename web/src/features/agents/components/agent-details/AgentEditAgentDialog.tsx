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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AGENT_TYPES } from "@/constants/agent-types";
import { toast } from "sonner";
import { useUpdateAgentMutation, type Agent } from "../../api";

export type AgentEditFormState = {
  name: string;
  email: string;
  mobileNumber: string;
  companyName: string;
  agentType: string;
  isActive: boolean;
};

function emptyForm(): AgentEditFormState {
  return {
    name: "",
    email: "",
    mobileNumber: "",
    companyName: "",
    agentType: "",
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
        companyName: agent.companyName ?? "",
        agentType: agent.agentType ?? "",
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
          name: form.name.trim(),
          email: form.email.trim() || undefined,
          mobileNumber: form.mobileNumber.trim() || undefined,
          companyName: form.companyName.trim() || undefined,
          agentType: form.agentType.trim() || undefined,
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
      <DialogContent className="sm:max-w-[425px]" aria-describedby="edit-agent-description">
        <DialogHeader>
          <DialogTitle>Edit agent</DialogTitle>
          <DialogDescription id="edit-agent-description">
            Update this partner agent&apos;s profile. Changes apply immediately.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="edit-agent-name">Agent name *</Label>
            <Input
              id="edit-agent-name"
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Full name of agent"
              autoComplete="name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-agent-company">Agency / company name</Label>
            <Input
              id="edit-agent-company"
              value={form.companyName}
              onChange={(e) => setForm((f) => ({ ...f, companyName: e.target.value }))}
              placeholder="e.g. Ace Recruitment Ltd"
              autoComplete="organization"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-agent-type">Agent type</Label>
            <Select
              value={form.agentType || undefined}
              onValueChange={(value) => setForm((f) => ({ ...f, agentType: value }))}
            >
              <SelectTrigger id="edit-agent-type" className="w-full">
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
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-agent-email">Email</Label>
            <Input
              id="edit-agent-email"
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="agent@example.com"
              autoComplete="email"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-agent-mobile">Mobile number</Label>
            <Input
              id="edit-agent-mobile"
              value={form.mobileNumber}
              onChange={(e) => setForm((f) => ({ ...f, mobileNumber: e.target.value }))}
              placeholder="+91 9876543210"
              autoComplete="tel"
            />
          </div>
          <div className="flex items-center justify-between gap-4 rounded-lg border border-border px-3 py-2">
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
