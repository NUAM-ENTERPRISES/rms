import { useEffect, useState } from "react";
import {
  AlertCircle,
  ArrowRightLeft,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Mail,
  Phone,
  Search,
  Users,
} from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CountrySelect } from "@/components/molecules/CountrySelect";
import { ImageViewer } from "@/components/molecules";
import { FlagIcon } from "@/shared";
import { useDebounce } from "@/hooks/useDebounce";
import { cn } from "@/lib/utils";
import {
  useGetCountryCoverageTransferPeersQuery,
  useGetCountryCoverageTransferPreviewQuery,
  useTransferCountryCoverageMutation,
  type TransferPreviewCandidate,
} from "../api/countryCoverageApi";

export interface TransferCountryCoverageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceCountryCode: string;
  userId: string;
  userName: string;
}

const CANDIDATES_PAGE_SIZE = 10;
const PEERS_PAGE_SIZE = 10;
const DEFAULT_PROFILE_IMAGE =
  "https://img.freepik.com/free-vector/isolated-young-handsome-man-different-poses-white-background-illustration_632498-859.jpg";

function formatPhone(
  phoneCountryCode: string | null | undefined,
  mobileNumber: string | null | undefined,
): string | null {
  const phone = [phoneCountryCode, mobileNumber].filter(Boolean).join(" ").trim();
  return phone || null;
}

function CandidateRow({
  candidate,
  checked,
  onToggle,
}: {
  candidate: TransferPreviewCandidate;
  checked: boolean;
  onToggle: (checked: boolean) => void;
}) {
  const phone = formatPhone(
    candidate.phoneCountryCode,
    candidate.mobileNumber,
  );
  const displayName =
    candidate.firstName?.trim() ||
    candidate.name?.trim() ||
    "Unknown candidate";

  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-3 border-b border-border px-3 py-3 last:border-b-0",
        "transition-colors",
        checked ? "bg-teal-50/70" : "hover:bg-slate-50/80",
      )}
    >
      <Checkbox
        checked={checked}
        onCheckedChange={(v) => onToggle(v === true)}
        aria-label={`Select ${displayName}`}
        className="mt-2.5"
      />
      <ImageViewer
        title={displayName}
        src={candidate.profileImage || null}
        fallbackSrc={DEFAULT_PROFILE_IMAGE}
        className="mt-0.5 h-11 w-11 shrink-0 rounded-full border border-border shadow-sm"
        ariaLabel={`Photo of ${displayName}`}
        enableHoverPreview
        hoverPosition="right"
      />
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-semibold text-slate-900">
            {displayName}
          </p>
          <Badge
            variant="outline"
            className="border-teal-200 bg-teal-50 text-xs font-medium text-teal-800"
          >
            {candidate.statusName}
          </Badge>
        </div>
        <div className="flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:gap-x-4 sm:gap-y-1">
          {candidate.email ? (
            <span className="inline-flex max-w-full items-center gap-1.5 text-xs text-slate-600">
              <Mail className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
              <span className="truncate">{candidate.email}</span>
            </span>
          ) : (
            <span className="text-xs text-slate-400">No email</span>
          )}
          {phone ? (
            <span className="inline-flex items-center gap-1.5 text-xs text-slate-600">
              <Phone className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
              <span>{phone}</span>
            </span>
          ) : (
            <span className="text-xs text-slate-400">No phone</span>
          )}
        </div>
      </div>
    </label>
  );
}

export function TransferCountryCoverageDialog({
  open,
  onOpenChange,
  sourceCountryCode,
  userId,
  userName,
}: TransferCountryCoverageDialogProps) {
  const [step, setStep] = useState<"form" | "confirm">("form");
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<string[]>([]);
  const [destinationCountryCode, setDestinationCountryCode] = useState("");
  const [selectedPeer, setSelectedPeer] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [peerSearch, setPeerSearch] = useState("");
  const [peerDropdownOpen, setPeerDropdownOpen] = useState(false);
  const [peerPage, setPeerPage] = useState(1);
  const [reason, setReason] = useState("");
  const [candidatePage, setCandidatePage] = useState(1);
  const [selectionInitialized, setSelectionInitialized] = useState(false);
  const debouncedPeerSearch = useDebounce(peerSearch, 300);

  const { data, isLoading, isError, isFetching } =
    useGetCountryCoverageTransferPreviewQuery(
      {
        sourceCountryCode,
        userId,
        page: candidatePage,
        limit: CANDIDATES_PAGE_SIZE,
      },
      { skip: !open || !userId || !sourceCountryCode },
    );

  const {
    data: peersData,
    isLoading: isPeersLoading,
    isFetching: isPeersFetching,
  } = useGetCountryCoverageTransferPeersQuery(
    {
      sourceCountryCode,
      userId,
      page: peerPage,
      limit: PEERS_PAGE_SIZE,
      search: debouncedPeerSearch || undefined,
    },
    {
      skip:
        !open ||
        !userId ||
        !sourceCountryCode ||
        !peerDropdownOpen,
    },
  );

  const [transferCoverage, { isLoading: isSubmitting }] =
    useTransferCountryCoverageMutation();

  const preview = data?.data;
  const positiveCandidates = preview?.positiveCandidates ?? [];
  const allPositiveCandidateIds = preview?.allPositiveCandidateIds ?? [];
  const peerRecruiters = peersData?.data?.peers ?? [];
  const peersPagination = peersData?.data?.pagination;
  const sourceCountryCodes = preview?.sourceCountryCodes ?? [];
  const pagination = preview?.pagination;
  const requiresHandoff =
    preview?.requiresCandidateHandoff ?? allPositiveCandidateIds.length > 0;

  const candidateTotalPages = Math.max(1, pagination?.totalPages ?? 1);
  const totalPositive = pagination?.total ?? allPositiveCandidateIds.length;
  const safeCandidatePage = Math.min(candidatePage, candidateTotalPages);
  const peerTotalPages = Math.max(1, peersPagination?.totalPages ?? 1);
  const peerTotal = peersPagination?.total ?? 0;
  const safePeerPage = Math.min(peerPage, peerTotalPages);

  const showingFrom =
    totalPositive === 0
      ? 0
      : (safeCandidatePage - 1) * CANDIDATES_PAGE_SIZE + 1;
  const showingTo = Math.min(
    safeCandidatePage * CANDIDATES_PAGE_SIZE,
    totalPositive,
  );

  const allSelected =
    allPositiveCandidateIds.length > 0 &&
    selectedCandidateIds.length === allPositiveCandidateIds.length &&
    allPositiveCandidateIds.every((id) => selectedCandidateIds.includes(id));

  useEffect(() => {
    if (!open) {
      setStep("form");
      setSelectedCandidateIds([]);
      setDestinationCountryCode("");
      setSelectedPeer(null);
      setPeerSearch("");
      setPeerDropdownOpen(false);
      setPeerPage(1);
      setReason("");
      setCandidatePage(1);
      setSelectionInitialized(false);
      return;
    }
  }, [open]);

  // Initialize selection once per open session (do not reset when paging).
  useEffect(() => {
    if (!open || !preview || selectionInitialized) return;
    setSelectedCandidateIds(preview.allPositiveCandidateIds);
    setSelectedPeer(null);
    setDestinationCountryCode("");
    setReason("");
    setStep("form");
    setSelectionInitialized(true);
  }, [open, preview, selectionInitialized]);

  // Keep page in range if total shrinks.
  useEffect(() => {
    if (candidatePage > candidateTotalPages) {
      setCandidatePage(candidateTotalPages);
    }
  }, [candidatePage, candidateTotalPages]);

  useEffect(() => {
    setPeerPage(1);
  }, [debouncedPeerSearch]);

  useEffect(() => {
    if (peerPage > peerTotalPages) {
      setPeerPage(peerTotalPages);
    }
  }, [peerPage, peerTotalPages]);

  const toggleCandidate = (id: string, checked: boolean) => {
    setSelectedCandidateIds((prev) =>
      checked ? [...new Set([...prev, id])] : prev.filter((x) => x !== id),
    );
  };

  const selectAllCandidates = (checked: boolean) => {
    setSelectedCandidateIds(checked ? [...allPositiveCandidateIds] : []);
  };

  const canProceedToConfirm =
    Boolean(destinationCountryCode) &&
    (!requiresHandoff || (allSelected && Boolean(selectedPeer?.id)));

  const handleConfirm = async () => {
    try {
      const result = await transferCoverage({
        sourceCountryCode,
        userId,
        destinationCountryCode,
        targetRecruiterId: requiresHandoff ? selectedPeer?.id : undefined,
        candidateIds: requiresHandoff ? selectedCandidateIds : [],
        reason: reason.trim() || undefined,
      }).unwrap();
      toast.success(result.message || "Country coverage transferred");
      onOpenChange(false);
    } catch (error: unknown) {
      const message =
        (error as { data?: { message?: string } })?.data?.message ||
        "Failed to transfer country coverage";
      toast.error(message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92vh] w-[calc(100vw-1.5rem)] max-w-3xl flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
        <DialogHeader className="shrink-0 space-y-0 border-b border-border px-6 py-5 text-left">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-teal-100 p-2.5">
              <ArrowRightLeft className="h-5 w-5 text-teal-700" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-xl font-semibold tracking-tight">
                Transfer country coverage
              </DialogTitle>
              <DialogDescription className="mt-1.5 text-sm leading-relaxed">
                Move{" "}
                <span className="font-semibold text-slate-700">{userName}</span>{" "}
                from{" "}
                <span className="font-semibold text-slate-700">
                  {sourceCountryCode}
                </span>{" "}
                to another country
                {requiresHandoff
                  ? " after handing off all positive candidates."
                  : "."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {(isLoading || isFetching) && !preview ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-7 w-7 animate-spin text-slate-400" />
            </div>
          ) : isError || !preview ? (
            <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-3 text-sm text-rose-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              Unable to load transfer preview. Try again.
            </div>
          ) : step === "form" ? (
            <div className="space-y-6">
              {requiresHandoff ? (
                <section className="space-y-3" aria-labelledby="positive-candidates-heading">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <Label
                        id="positive-candidates-heading"
                        className="text-sm font-semibold text-slate-800"
                      >
                        Positive candidates{" "}
                        <span className="text-destructive">*</span>
                      </Label>
                      <p className="mt-0.5 text-xs text-slate-500">
                        All must be selected before coverage can move. Deployed,
                        hired, and not-interested are excluded.
                      </p>
                    </div>
                    <label className="flex shrink-0 items-center gap-2 rounded-md border border-border bg-slate-50 px-2.5 py-1.5 text-xs text-slate-700">
                      <Checkbox
                        checked={allSelected}
                        onCheckedChange={(v) =>
                          selectAllCandidates(v === true)
                        }
                        aria-label="Select all positive candidates"
                      />
                      Select all ({totalPositive})
                    </label>
                  </div>

                  {!allSelected && (
                    <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                      <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      Select every positive candidate to continue.
                    </div>
                  )}

                  <div className="overflow-hidden rounded-xl border border-border bg-white shadow-sm">
                    <div className="relative max-h-[min(22rem,42vh)] overflow-y-auto">
                      {isFetching && (
                        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60">
                          <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                        </div>
                      )}
                      {positiveCandidates.length === 0 ? (
                        <div className="px-3 py-8 text-center text-sm text-slate-500">
                          No positive candidates on this page.
                        </div>
                      ) : (
                        positiveCandidates.map((c) => (
                          <CandidateRow
                            key={c.id}
                            candidate={c}
                            checked={selectedCandidateIds.includes(c.id)}
                            onToggle={(checked) =>
                              toggleCandidate(c.id, checked)
                            }
                          />
                        ))
                      )}
                    </div>

                    {totalPositive > CANDIDATES_PAGE_SIZE && (
                      <div className="flex flex-col gap-2 border-t border-border bg-slate-50/80 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-xs text-slate-500">
                          Showing{" "}
                          <span className="font-semibold text-slate-700">
                            {showingFrom}
                          </span>
                          –
                          <span className="font-semibold text-slate-700">
                            {showingTo}
                          </span>{" "}
                          of{" "}
                          <span className="font-semibold text-slate-700">
                            {totalPositive}
                          </span>
                        </p>
                        <div className="flex items-center gap-1.5">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 gap-1 text-xs"
                            disabled={safeCandidatePage <= 1 || isFetching}
                            onClick={() =>
                              setCandidatePage((p) => Math.max(1, p - 1))
                            }
                            aria-label="Previous candidates page"
                          >
                            <ChevronLeft className="h-3.5 w-3.5" />
                            Prev
                          </Button>
                          <span className="min-w-[4.5rem] text-center text-xs text-slate-600">
                            Page {safeCandidatePage} of {candidateTotalPages}
                          </span>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 gap-1 text-xs"
                            disabled={
                              safeCandidatePage >= candidateTotalPages ||
                              isFetching
                            }
                            onClick={() =>
                              setCandidatePage((p) =>
                                Math.min(candidateTotalPages, p + 1),
                              )
                            }
                            aria-label="Next candidates page"
                          >
                            Next
                            <ChevronRight className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </section>
              ) : (
                <div className="flex items-start gap-2 rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-900">
                  <Users className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                  No positive candidates to hand off. Coverage can move
                  directly.
                </div>
              )}

              <div
                className={cn(
                  "grid gap-5",
                  requiresHandoff ? "sm:grid-cols-2" : "sm:grid-cols-1",
                )}
              >
                {requiresHandoff && (
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-slate-800">
                      Transfer to recruiter{" "}
                      <span className="text-destructive">*</span>
                    </Label>
                    <p className="text-xs text-slate-500">
                      Only recruiters who cover {sourceCountryCode}.
                    </p>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setPeerDropdownOpen((v) => !v)}
                        className={cn(
                          "flex h-11 w-full cursor-pointer items-center justify-between gap-2 rounded-lg border border-border bg-background px-3 text-sm",
                          "focus:outline-none focus:ring-2 focus:ring-ring",
                        )}
                        aria-expanded={peerDropdownOpen}
                        aria-haspopup="listbox"
                      >
                        <span
                          className={
                            selectedPeer
                              ? "truncate text-foreground"
                              : "text-muted-foreground"
                          }
                        >
                          {selectedPeer
                            ? selectedPeer.name
                            : "Select a peer recruiter..."}
                        </span>
                        <ChevronDown
                          className={cn(
                            "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                            peerDropdownOpen && "rotate-180",
                          )}
                        />
                      </button>
                      {peerDropdownOpen && (
                        <div className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-background shadow-lg">
                          <div className="border-b border-border p-2">
                            <div className="relative">
                              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                              <Input
                                autoFocus
                                placeholder="Search recruiters..."
                                value={peerSearch}
                                onChange={(e) => setPeerSearch(e.target.value)}
                                className="h-8 pl-8 text-sm"
                              />
                            </div>
                          </div>
                          <div
                            className="relative max-h-52 overflow-y-auto"
                            role="listbox"
                            aria-label="Peer recruiters"
                          >
                            {(isPeersLoading || isPeersFetching) && (
                              <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60">
                                <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                              </div>
                            )}
                            {peerRecruiters.length === 0 &&
                            !isPeersLoading &&
                            !isPeersFetching ? (
                              <div className="py-6 text-center text-sm text-muted-foreground">
                                No peer recruiters available
                              </div>
                            ) : (
                              peerRecruiters.map((peer) => {
                                const isSelected =
                                  selectedPeer?.id === peer.id;
                                return (
                                  <button
                                    key={peer.id}
                                    type="button"
                                    role="option"
                                    aria-selected={isSelected}
                                    onClick={() => {
                                      setSelectedPeer({
                                        id: peer.id,
                                        name: peer.name,
                                      });
                                      setPeerDropdownOpen(false);
                                    }}
                                    className={cn(
                                      "flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm",
                                      isSelected
                                        ? "bg-teal-50"
                                        : "hover:bg-slate-50",
                                    )}
                                  >
                                    <div className="min-w-0 flex-1">
                                      <div className="truncate font-medium text-slate-900">
                                        {peer.name}
                                      </div>
                                      <div className="truncate text-xs text-slate-500">
                                        {peer.email}
                                      </div>
                                      <div className="mt-1 flex flex-wrap gap-1">
                                        {peer.coveredCountryCodes
                                          .slice(0, 4)
                                          .map((code) => (
                                            <span
                                              key={code}
                                              className="inline-flex items-center gap-1 rounded border border-border bg-slate-50 px-1.5 py-0.5 text-[10px] text-slate-700"
                                            >
                                              <FlagIcon
                                                countryCode={code}
                                                size="sm"
                                              />
                                              {code}
                                            </span>
                                          ))}
                                      </div>
                                    </div>
                                    {isSelected && (
                                      <Check className="h-4 w-4 shrink-0 text-teal-600" />
                                    )}
                                  </button>
                                );
                              })
                            )}
                          </div>
                          {peerTotal > PEERS_PAGE_SIZE && (
                            <div className="flex items-center justify-between gap-2 border-t border-border bg-slate-50/80 px-2 py-2">
                              <span className="text-[11px] text-slate-500">
                                Page {safePeerPage} of {peerTotalPages}
                              </span>
                              <div className="flex items-center gap-1">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-7 gap-1 px-2 text-[11px]"
                                  disabled={safePeerPage <= 1 || isPeersFetching}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setPeerPage((p) => Math.max(1, p - 1));
                                  }}
                                  aria-label="Previous peers page"
                                >
                                  <ChevronLeft className="h-3 w-3" />
                                  Prev
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-7 gap-1 px-2 text-[11px]"
                                  disabled={
                                    safePeerPage >= peerTotalPages ||
                                    isPeersFetching
                                  }
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setPeerPage((p) =>
                                      Math.min(peerTotalPages, p + 1),
                                    );
                                  }}
                                  aria-label="Next peers page"
                                >
                                  Next
                                  <ChevronRight className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-slate-800">
                    Destination country{" "}
                    <span className="text-destructive">*</span>
                  </Label>
                  <p className="text-xs text-slate-500">
                    Country this recruiter will cover after transfer.
                  </p>
                  <CountrySelect
                    value={destinationCountryCode}
                    onValueChange={(code) => {
                      if (sourceCountryCodes.includes(code)) {
                        toast.error(
                          "Destination must be outside the source coverage being transferred",
                        );
                        return;
                      }
                      setDestinationCountryCode(code);
                    }}
                    placeholder="Select destination country..."
                    allowEmpty={false}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="coverage-transfer-reason"
                  className="text-sm font-semibold text-slate-800"
                >
                  Reason (optional)
                </Label>
                <Textarea
                  id="coverage-transfer-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. GCC has no open projects; Ireland has multiple"
                  rows={2}
                  maxLength={500}
                  className="resize-none"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4 text-sm text-slate-700">
              <div className="rounded-xl border border-border bg-slate-50/80 px-4 py-4">
                <p className="leading-relaxed">
                  Confirm transferring{" "}
                  <span className="font-semibold text-slate-900">
                    {userName}
                  </span>
                  &apos;s coverage from{" "}
                  <span className="font-semibold text-slate-900">
                    {sourceCountryCode}
                  </span>{" "}
                  to{" "}
                  <span className="font-semibold text-slate-900">
                    {destinationCountryCode}
                  </span>
                  .
                </p>
                {requiresHandoff && selectedPeer && (
                  <p className="mt-2 leading-relaxed">
                    {selectedCandidateIds.length} positive candidate
                    {selectedCandidateIds.length === 1 ? "" : "s"} will be
                    reassigned to{" "}
                    <span className="font-semibold text-slate-900">
                      {selectedPeer.name}
                    </span>
                    .
                  </p>
                )}
              </div>
              {preview.currentCoverages.length > 0 && (
                <div className="rounded-lg border border-border px-3 py-2.5 text-xs text-slate-600">
                  Removing:{" "}
                  {preview.currentCoverages
                    .map((c) => `${c.countryName} (${c.countryCode})`)
                    .join(", ")}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="shrink-0 gap-2 border-t border-border bg-slate-50/60 px-6 py-4 sm:gap-2">
          {step === "confirm" ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep("form")}
                disabled={isSubmitting}
              >
                Back
              </Button>
              <Button
                type="button"
                onClick={handleConfirm}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Transferring...
                  </>
                ) : (
                  "Confirm transfer"
                )}
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => setStep("confirm")}
                disabled={!canProceedToConfirm || isLoading}
              >
                Review &amp; confirm
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
