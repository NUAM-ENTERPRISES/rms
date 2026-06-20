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
import { useCreateAgentMutation, type CreateAgentRequest } from "../api";
import { CreateAgentProjectLinksField } from "./CreateAgentProjectLinksField";
import { AgentFormFieldsSection } from "./AgentFormFields";
import {
  agentFormFieldsToPayload,
  initialAgentFormFields,
  type AgentFormFields,
} from "../utils/agent-form.utils";

export type CreateAgentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CreateAgentDialog({ open, onOpenChange }: CreateAgentDialogProps) {
  const [formData, setFormData] = useState<AgentFormFields>(initialAgentFormFields);
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
      setFormData(initialAgentFormFields);
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

    const payload: CreateAgentRequest = agentFormFieldsToPayload(formData);
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
      <DialogContent className="sm:max-w-3xl w-[calc(100vw-2rem)] max-h-[85vh] overflow-y-auto gap-3 p-6">
        <DialogHeader className="space-y-1 pb-0">
          <p className="text-xs font-medium text-slate-500">Step {step} of 2</p>
          <DialogTitle className="text-lg">
            {step === 1 ? "Add New Agent" : "Link projects (optional)"}
          </DialogTitle>
          <DialogDescription className="text-sm">
            {step === 1
              ? "Enter agent details. Link projects on the next step (optional)."
              : "Select projects for this agent, or skip and add links later from the profile."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3 pt-1">
          {step === 1 ? (
            <AgentFormFieldsSection
              idPrefix="create-agent"
              form={formData}
              onChange={(updates) => setFormData((prev) => ({ ...prev, ...updates }))}
            />
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
          <DialogFooter className="pt-2 gap-2 sm:gap-0 flex-col sm:flex-row border-t border-slate-100 mt-1">
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
