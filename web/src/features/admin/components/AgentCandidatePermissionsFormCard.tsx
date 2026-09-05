import { Control, Controller } from "react-hook-form";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { UserPlus } from "lucide-react";

export type AgentCandidatePermissionFields = {
  createAgentCandidatesEnabled: boolean;
};

export interface AgentCandidatePermissionsFormCardProps<
  T extends AgentCandidatePermissionFields,
> {
  control: Control<T>;
  disabled?: boolean;
}

export function AgentCandidatePermissionsFormCard<
  T extends AgentCandidatePermissionFields,
>({
  control,
  disabled = false,
}: AgentCandidatePermissionsFormCardProps<T>) {
  return (
    <Card className="border-0 shadow-lg bg-card/80 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-xl font-semibold text-foreground flex items-center gap-2">
          <UserPlus className="h-5 w-5 text-primary" />
          Agents Add Candidate
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          Grant this user permission to add candidates from the Agents page.
          Manager-level roles receive this from their role; use this for other
          users.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Controller
          name={"createAgentCandidatesEnabled" as never}
          control={control}
          render={({ field }) => (
            <div className="flex items-start gap-3 rounded-lg border border-border bg-muted px-4 py-3">
              <Checkbox
                id="createAgentCandidatesEnabled"
                checked={field.value}
                onCheckedChange={(checked) => field.onChange(checked === true)}
                disabled={disabled}
                aria-label="Add candidates from Agents"
              />
              <div className="space-y-1">
                <Label
                  htmlFor="createAgentCandidatesEnabled"
                  className="text-sm font-medium text-foreground flex items-center gap-2 cursor-pointer"
                >
                  Add candidates from Agents
                </Label>
                <p className="text-xs text-muted-foreground">
                  Shows the Add Candidate button on Agents and allows creating
                  candidates from that flow.
                </p>
              </div>
            </div>
          )}
        />
      </CardContent>
    </Card>
  );
}
