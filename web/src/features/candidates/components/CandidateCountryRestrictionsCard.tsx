import { useState } from "react";
import { format } from "date-fns";
import { Globe, ShieldAlert, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  useGetCandidateCountryRestrictionsQuery,
  useLiftCandidateCountryRestrictionMutation,
  type CandidateCountryRestriction,
} from "@/features/candidates/api";
import { CountryRestrictionsPagination } from "@/features/candidates/components/CountryRestrictionsPagination";

const COUNTRY_RESTRICTIONS_PAGE_SIZE = 5;

const RESTRICTION_TYPE_LABELS: Record<string, string> = {
  processing_step_cancel: "Processing step cancel",
  manual: "Manual",
};

function getRestrictionTypeLabel(type: string): string {
  return RESTRICTION_TYPE_LABELS[type] ?? type;
}

function getRestrictionSourceLabel(restriction: CandidateCountryRestriction): string | null {
  const meta = restriction.sourceMeta;
  if (!meta) return null;
  if (meta.projectTitle) {
    return meta.projectTitle;
  }
  return null;
}

interface CandidateCountryRestrictionsCardProps {
  candidateId: string;
  canLiftRestrictions?: boolean;
}

export function CandidateCountryRestrictionsCard({
  candidateId,
  canLiftRestrictions = false,
}: CandidateCountryRestrictionsCardProps) {
  const [page, setPage] = useState(1);
  const { data, isLoading, isFetching } = useGetCandidateCountryRestrictionsQuery({
    candidateId,
    page,
    limit: COUNTRY_RESTRICTIONS_PAGE_SIZE,
  });
  const [liftRestriction, { isLoading: isLifting }] =
    useLiftCandidateCountryRestrictionMutation();

  const [liftTarget, setLiftTarget] = useState<CandidateCountryRestriction | null>(
    null,
  );
  const [liftReason, setLiftReason] = useState("");

  const restrictions = data?.items ?? [];
  const pagination = data?.pagination ?? {
    page: 1,
    limit: COUNTRY_RESTRICTIONS_PAGE_SIZE,
    total: 0,
    totalPages: 1,
  };
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
    } catch (error: unknown) {
      const err = error as { data?: { message?: string } };
      toast.error(err?.data?.message || "Failed to lift restriction");
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-6 flex items-center justify-center text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
          Loading country restrictions...
        </CardContent>
      </Card>
    );
  }

  if (pagination.total === 0) {
    return null;
  }

  return (
    <>
      <Card className="border-amber-200 bg-amber-50/40">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2 text-amber-950">
            <ShieldAlert className="h-4 w-4" aria-hidden />
            Country Restrictions
            {pagination.total > 0 ? (
              <Badge variant="secondary" className="text-[10px] font-bold">
                {pagination.total}
              </Badge>
            ) : null}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {activeRestrictions.map((restriction) => {
            const sourceLabel = getRestrictionSourceLabel(restriction);
            return (
              <div
                key={restriction.id}
                className="rounded-lg border border-amber-200 bg-background p-3 space-y-2"
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
                {canLiftRestrictions ? (
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
                ) : null}
              </div>
            );
          })}
          <CountryRestrictionsPagination
            pagination={pagination}
            onPageChange={setPage}
            isLoading={isFetching}
          />
        </CardContent>
      </Card>

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
            <Label htmlFor="lift-reason">Reason</Label>
            <Textarea
              id="lift-reason"
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
