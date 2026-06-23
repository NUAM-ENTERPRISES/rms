import { useState } from "react";
import { format } from "date-fns";
import { Globe, Loader2, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { FlagIcon } from "@/shared";
import { cn } from "@/lib/utils";
import {
  useGetCandidateCountryRestrictionsQuery,
  useLiftCandidateCountryRestrictionMutation,
  type CandidateCountryRestriction,
} from "@/features/candidates/api";

const RESTRICTION_TYPE_LABELS: Record<string, string> = {
  processing_step_cancel: "Processing step cancel",
  manual: "Manual",
};

function getRestrictionTypeLabel(type: string): string {
  return RESTRICTION_TYPE_LABELS[type] ?? type;
}

function getRestrictionSourceLabel(restriction: CandidateCountryRestriction): string | null {
  const meta = restriction.sourceMeta;
  if (!meta?.projectTitle) return null;
  return meta.projectTitle;
}

interface CandidateCountryRestrictionsSectionProps {
  candidateId: string;
  canEdit?: boolean;
}

export function CandidateCountryRestrictionsSection({
  candidateId,
  canEdit = false,
}: CandidateCountryRestrictionsSectionProps) {
  const { data, isLoading, isFetching } = useGetCandidateCountryRestrictionsQuery({
    candidateId,
    page: 1,
    limit: 20,
  });
  const [liftRestriction, { isLoading: isLifting }] =
    useLiftCandidateCountryRestrictionMutation();

  const [isManageOpen, setIsManageOpen] = useState(false);
  const [liftTarget, setLiftTarget] = useState<CandidateCountryRestriction | null>(
    null,
  );
  const [liftReason, setLiftReason] = useState("");

  const restrictions = data?.items ?? [];
  const activeRestrictions = restrictions.filter((item) => item.isActive);

  const handleLift = async () => {
    if (!liftTarget || liftReason.trim().length < 10) return;
    try {
      await liftRestriction({
        candidateId,
        countryCode: liftTarget.countryCode,
        reason: liftReason.trim(),
      }).unwrap();
      toast.success("Country restriction lifted");
      setLiftTarget(null);
      setLiftReason("");
      if (activeRestrictions.length <= 1) {
        setIsManageOpen(false);
      }
    } catch (error: unknown) {
      const err = error as { data?: { message?: string } };
      toast.error(err?.data?.message || "Failed to lift restriction");
    }
  };

  if (isLoading) {
    return (
      <span className="text-sm text-slate-400 italic inline-flex items-center gap-2">
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
        Loading...
      </span>
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-1.5">
        {activeRestrictions.length > 0 ? (
          activeRestrictions.map((restriction) => (
            <Badge
              key={restriction.id}
              variant="outline"
              className="bg-amber-50 text-amber-900 border-amber-200 gap-1"
            >
              <FlagIcon
                countryCode={restriction.countryCode}
                size="sm"
                className="rounded-sm"
                aria-hidden
              />
              {restriction.country?.name || restriction.countryCode}
            </Badge>
          ))
        ) : (
          <span className="text-sm text-slate-400 italic">N/A</span>
        )}
        {canEdit && activeRestrictions.length > 0 ? (
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsManageOpen(true)}
                  disabled={isFetching}
                  aria-label="Manage country restrictions"
                  className={cn(
                    "h-7 w-7 shrink-0 rounded-full",
                    "text-amber-700 hover:text-amber-900",
                    "hover:bg-amber-100 border border-transparent hover:border-amber-200",
                    "transition-colors",
                  )}
                >
                  <Settings2 className="h-3.5 w-3.5" aria-hidden />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                Manage country restrictions
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : null}
      </div>

      <Dialog open={isManageOpen} onOpenChange={setIsManageOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Manage country restrictions</DialogTitle>
            <DialogDescription>
              Active restrictions block this candidate from projects in the listed
              countries. Lift a restriction with a required reason.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 max-h-[50vh] overflow-y-auto">
            {activeRestrictions.map((restriction) => {
              const sourceLabel = getRestrictionSourceLabel(restriction);
              return (
                <div
                  key={restriction.id}
                  className="rounded-lg border border-amber-200 bg-amber-50/40 p-3 space-y-2"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="gap-1">
                      <Globe className="h-3 w-3" aria-hidden />
                      {restriction.country?.name || restriction.countryCode}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {getRestrictionTypeLabel(restriction.restrictionType)}
                    </Badge>
                  </div>
                  <p className="text-sm text-foreground">{restriction.reason}</p>
                  <div className="text-xs text-muted-foreground space-y-1">
                    {sourceLabel ? <p>Source project: {sourceLabel}</p> : null}
                    <p>
                      Restricted on{" "}
                      {format(new Date(restriction.restrictedAt), "dd MMM yyyy")}
                      {restriction.restrictedBy?.name
                        ? ` by ${restriction.restrictedBy.name}`
                        : ""}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setLiftTarget(restriction);
                      setLiftReason("");
                    }}
                  >
                    Lift restriction
                  </Button>
                </div>
              );
            })}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsManageOpen(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(liftTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setLiftTarget(null);
            setLiftReason("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Lift country restriction</DialogTitle>
            <DialogDescription>
              Remove the active restriction for{" "}
              {liftTarget?.country?.name || liftTarget?.countryCode}. A reason is
              required.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="profile-lift-reason">Reason</Label>
            <Textarea
              id="profile-lift-reason"
              value={liftReason}
              onChange={(e) => setLiftReason(e.target.value)}
              rows={4}
              placeholder="Explain why this restriction should be lifted (minimum 10 characters)"
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setLiftTarget(null)}
              disabled={isLifting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleLift}
              disabled={isLifting || liftReason.trim().length < 10}
            >
              {isLifting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Lift restriction
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
