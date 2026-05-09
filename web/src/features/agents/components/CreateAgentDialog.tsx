import { useEffect, useState, type FormEvent } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AGENT_TYPES } from "@/constants/agent-types";
import { useCreateAgentMutation, type CreateAgentRequest } from "../api";
import { CreateAgentProjectLinksField } from "./CreateAgentProjectLinksField";

const initialForm = {
  name: "",
  email: "",
  mobileNumber: "",
  companyName: "",
  agentType: "",
};

export type CreateAgentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CreateAgentDialog({ open, onOpenChange }: CreateAgentDialogProps) {
  const [formData, setFormData] = useState(initialForm);
  const [createAgentProjectIds, setCreateAgentProjectIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [createAgentProjectNotes, setCreateAgentProjectNotes] = useState<
    Record<string, string>
  >({});
  const [step, setStep] = useState<1 | 2>(1);

  const [createAgent, { isLoading: isCreating }] = useCreateAgentMutation();

  useEffect(() => {
    if (open) {
      setFormData(initialForm);
      setCreateAgentProjectIds(new Set());
      setCreateAgentProjectNotes({});
      setStep(1);
    }
  }, [open]);

  const handleClose = () => {
    onOpenChange(false);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (step === 1) {
      if (!formData.name.trim()) {
        toast.error("Agent name is required");
        return;
      }
      setStep(2);
      return;
    }

    const payload: CreateAgentRequest = { ...formData };
    if (createAgentProjectIds.size > 0) {
      payload.projectLinks = [...createAgentProjectIds].map((projectId) => {
        const raw = createAgentProjectNotes[projectId]?.trim();
        return raw ? { projectId, notes: raw } : { projectId };
      });
    }
    try {
      await createAgent(payload).unwrap();
      toast.success("Agent created successfully");
      onOpenChange(false);
    } catch {
      toast.error("Failed to save agent");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <p className="text-xs font-medium text-slate-500 mb-1">Step {step} of 2</p>
          <DialogTitle>
            {step === 1 ? "Add New Agent" : "Link projects (optional)"}
          </DialogTitle>
          <DialogDescription>
            {step === 1
              ? "Enter agent details. You can link client projects on the next step."
              : "Search and select active projects to tie to this agent, or leave empty and create — you can add links later from the agent profile."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          {step === 1 ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="create-agent-name">Agent Name *</Label>
                <Input
                  id="create-agent-name"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Full name of agent"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-agent-company">Agency/Organization Name</Label>
                <Input
                  id="create-agent-company"
                  value={formData.companyName}
                  onChange={(e) =>
                    setFormData({ ...formData, companyName: e.target.value })
                  }
                  placeholder="e.g. Ace Recruitment Ltd"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-agent-type">Agent Type</Label>
                <Select
                  value={formData.agentType}
                  onValueChange={(value) => setFormData({ ...formData, agentType: value })}
                >
                  <SelectTrigger id="create-agent-type" className="w-full">
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
                <Label htmlFor="create-agent-email">Email Address</Label>
                <Input
                  id="create-agent-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="agent@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-agent-mobile">Mobile Number</Label>
                <Input
                  id="create-agent-mobile"
                  value={formData.mobileNumber}
                  onChange={(e) =>
                    setFormData({ ...formData, mobileNumber: e.target.value })
                  }
                  placeholder="+91 9876543210"
                />
              </div>
            </>
          ) : (
            <CreateAgentProjectLinksField
              enabled={open && step === 2}
              selectedIds={createAgentProjectIds}
              onToggleProject={(projectId, selected) => {
                setCreateAgentProjectIds((prev) => {
                  const next = new Set(prev);
                  if (selected) {
                    next.add(projectId);
                  } else {
                    next.delete(projectId);
                    setCreateAgentProjectNotes((notes) => {
                      const { [projectId]: _, ...rest } = notes;
                      return rest;
                    });
                  }
                  return next;
                });
              }}
              notesByProjectId={createAgentProjectNotes}
              onNotesChange={(projectId, notes) =>
                setCreateAgentProjectNotes((prev) => ({ ...prev, [projectId]: notes }))
              }
            />
          )}
          <DialogFooter className="pt-4 gap-2 sm:gap-0 flex-col sm:flex-row">
            {step === 1 ? (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  className="sm:mr-auto"
                  onClick={handleClose}
                >
                  Cancel
                </Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700 gap-1">
                  Next
                  <ChevronRight className="h-4 w-4" aria-hidden />
                </Button>
              </>
            ) : (
              <>
                <Button
                  type="button"
                  variant="outline"
                  className="sm:mr-auto gap-1"
                  onClick={() => setStep(1)}
                  disabled={isCreating}
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden />
                  Back
                </Button>
                <Button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700"
                  disabled={isCreating}
                >
                  {isCreating ? "Creating…" : "Create Agent"}
                </Button>
              </>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
