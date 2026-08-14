import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  ArrowRightLeft,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Mail,
  Phone,
  Search,
  Split,
  Users,
  X,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CountrySelect } from "@/components/molecules/CountrySelect";
import { ImageViewer } from "@/components/molecules";
import { FlagIcon } from "@/shared";
import { useDebounce } from "@/hooks/useDebounce";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  useGetCountryCoverageTransferPeersQuery,
  useGetCountryCoverageTransferPreviewQuery,
  useTransferCountryCoverageMutation,
  type PositiveCandidateProfession,
  type TransferPreviewCandidate,
  type TransferPreviewPeer,
  type TransferProfessionScope,
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
const GCC_DESTINATION_CODES = ["SA", "AE", "QA", "OM", "BH", "KW"] as const;
const DEFAULT_PROFILE_IMAGE =
  "https://img.freepik.com/free-vector/isolated-young-handsome-man-different-poses-white-background-illustration_632498-859.jpg";

function resolveDestinationCodes(code: string): string[] {
  const normalized = code.trim().toUpperCase();
  if (normalized === "GCC") {
    return [...GCC_DESTINATION_CODES];
  }
  return [normalized];
}

function destinationOverlapsSource(
  destinationCode: string,
  sourceCountryCodes: string[],
): boolean {
  const destCodes = resolveDestinationCodes(destinationCode);
  const sourceSet = new Set(
    sourceCountryCodes.map((c) => c.trim().toUpperCase()),
  );
  return destCodes.some((code) => sourceSet.has(code));
}

type SelectedPeer = {
  id: string;
  name: string;
  profileImage: string | null;
  positiveCandidateCount: number;
  professionScopes: TransferProfessionScope[];
  sectorScopes: Array<"HEALTHCARE" | "NON_HEALTH_CARE">;
  handlesAllProfessions?: boolean;
  recruiterSectorScope?: "HEALTHCARE" | "NON_HEALTH_CARE" | "BOTH" | null;
};

function sectorLabel(sector: string | null | undefined) {
  if (sector === "HEALTHCARE") return "Healthcare";
  if (sector === "NON_HEALTH_CARE") return "Non-healthcare";
  return null;
}

function peerHandlesProfession(
  peer: {
    professionScopes: { id: string }[];
    handlesAllProfessions?: boolean;
    recruiterSectorScope?: "HEALTHCARE" | "NON_HEALTH_CARE" | "BOTH" | null;
  },
  profession: {
    id: string | null;
    sector?: "HEALTHCARE" | "NON_HEALTH_CARE" | null;
  },
) {
  if (peer.handlesAllProfessions) {
    if (peer.recruiterSectorScope === "BOTH") return true;
    return Boolean(
      profession.sector && peer.recruiterSectorScope === profession.sector,
    );
  }
  return peer.professionScopes.some((s) => s.id === profession.id);
}

function formatPeerProfessionsSummary(
  peer: Pick<
    TransferPreviewPeer,
    "professionScopes" | "handlesAllProfessions" | "recruiterSectorScope"
  >,
): string {
  if (peer.handlesAllProfessions) {
    if (peer.recruiterSectorScope === "HEALTHCARE") return "Any · Healthcare";
    if (peer.recruiterSectorScope === "NON_HEALTH_CARE") {
      return "Any · Non-healthcare";
    }
    return "Any · All professions";
  }
  const visible = peer.professionScopes.slice(0, 3).map((s) => s.label);
  if (peer.professionScopes.length > 3) {
    visible.push(`+${peer.professionScopes.length - 3}`);
  }
  return visible.join(", ");
}

function formatPeerOptionAriaLabel(peer: TransferPreviewPeer): string {
  const professionSummary = formatPeerProfessionsSummary(peer);
  const professionPart = professionSummary ? `, ${professionSummary}` : "";
  const sectorPart =
    peer.sectorScopes.length > 0
      ? `, ${peer.sectorScopes.map((s) => sectorLabel(s)).filter(Boolean).join(", ")}`
      : "";
  return `${peer.name}${professionPart}${sectorPart}, ${peer.positiveCandidateCount} positive candidates`;
}

function formatPhone(
  phoneCountryCode: string | null | undefined,
  mobileNumber: string | null | undefined,
): string | null {
  const phone = [phoneCountryCode, mobileNumber]
    .filter(Boolean)
    .join(" ")
    .trim();
  return phone || null;
}

/** Matches backend partitionEvenly count distribution (peers sorted by id). */
function previewEvenSplitCounts(
  total: number,
  peerIds: string[],
): Record<string, number> {
  const sorted = [...peerIds].sort((a, b) => a.localeCompare(b));
  const counts: Record<string, number> = {};
  if (sorted.length === 0 || total === 0) return counts;

  const base = Math.floor(total / sorted.length);
  let remainder = total % sorted.length;
  for (const id of sorted) {
    counts[id] = base + (remainder > 0 ? 1 : 0);
    if (remainder > 0) remainder -= 1;
  }
  return counts;
}

/** Profession-aware even split: partition each profession group among matching peers. */
function previewProfessionAwareEvenSplitCounts(
  professions: PositiveCandidateProfession[],
  peers: SelectedPeer[],
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const peer of peers) {
    counts[peer.id] = 0;
  }
  if (professions.length === 0 || peers.length === 0) {
    return counts;
  }

  const byProfession = new Map<
    string,
    {
      total: number;
      professionTypeId: string | null;
      sector: PositiveCandidateProfession["sector"];
    }
  >();
  for (const entry of professions) {
    const groupKey = entry.professionTypeId ?? `__any__:${entry.sector ?? "unknown"}`;
    const existing = byProfession.get(groupKey);
    if (existing) {
      existing.total += 1;
    } else {
      byProfession.set(groupKey, {
        total: 1,
        professionTypeId: entry.professionTypeId,
        sector: entry.sector,
      });
    }
  }

  for (const group of byProfession.values()) {
    const matchingPeerIds = peers
      .filter((peer) =>
        peerHandlesProfession(peer, {
          id: group.professionTypeId,
          sector: group.sector,
        }),
      )
      .map((peer) => peer.id);
    if (matchingPeerIds.length === 0) continue;

    const split = previewEvenSplitCounts(group.total, matchingPeerIds);
    for (const [peerId, n] of Object.entries(split)) {
      counts[peerId] = (counts[peerId] ?? 0) + n;
    }
  }

  return counts;
}

/** Plain-language reason when auto-split gives a recruiter zero candidates. */
function autoSplitZeroReason(
  peer: SelectedPeer,
  professions: PositiveCandidateProfession[],
): string {
  const peerLabels = peer.professionScopes.map((s) => s.label).filter(Boolean);
  const candidateLabels = [
    ...new Set(professions.map((p) => p.professionLabel).filter(Boolean)),
  ];

  if (peerLabels.length === 0) {
    return "Gets 0 because this recruiter has no job types set, so no candidates can be handed over to them.";
  }

  if (candidateLabels.length === 0) {
    return "Gets 0 because there are no candidates to hand over.";
  }

  const peerPart =
    peerLabels.length <= 3
      ? peerLabels.join(", ")
      : `${peerLabels.slice(0, 3).join(", ")} +${peerLabels.length - 3} more`;
  const candidatePart =
    candidateLabels.length <= 3
      ? candidateLabels.join(", ")
      : `${candidateLabels.slice(0, 3).join(", ")} +${candidateLabels.length - 3} more`;

  return `Gets 0 because none of these candidates match ${peer.name}'s job types (${peerPart}). Candidates here are: ${candidatePart}.`;
}

function buildManualAssignments(
  assignments: Record<string, string>,
): Array<{ targetRecruiterId: string; candidateIds: string[] }> {
  const byPeer = new Map<string, string[]>();
  for (const [candidateId, peerId] of Object.entries(assignments)) {
    const list = byPeer.get(peerId) ?? [];
    list.push(candidateId);
    byPeer.set(peerId, list);
  }
  return Array.from(byPeer.entries()).map(([targetRecruiterId, candidateIds]) => ({
    targetRecruiterId,
    candidateIds,
  }));
}

function CandidateCard({
  candidate,
  selectedPeers,
  assignedPeerId,
  useEvenSplit,
  onAssign,
}: {
  candidate: TransferPreviewCandidate;
  selectedPeers: SelectedPeer[];
  assignedPeerId: string | undefined;
  useEvenSplit: boolean;
  onAssign: (peerId: string) => void;
}) {
  const phone = formatPhone(
    candidate.phoneCountryCode,
    candidate.mobileNumber,
  );
  const displayName =
    candidate.firstName?.trim() ||
    candidate.name?.trim() ||
    "Unknown candidate";
  const assignedPeer = assignedPeerId
    ? selectedPeers.find((peer) => peer.id === assignedPeerId)
    : undefined;
  const isMismatch = useEvenSplit
    ? selectedPeers.length > 0 &&
      !selectedPeers.some((peer) =>
        peerHandlesProfession(peer, {
          id: candidate.professionTypeId,
          sector: candidate.sector,
        }),
      )
    : Boolean(
        assignedPeer &&
          !peerHandlesProfession(assignedPeer, {
            id: candidate.professionTypeId,
            sector: candidate.sector,
          }),
      );
  const candidateSectorLabel = sectorLabel(candidate.sector);

  return (
    <article
      className={cn(
        "flex flex-col gap-2 rounded-lg border border-border bg-card p-2.5 shadow-sm",
        "transition-colors",
        isMismatch && "border-rose-300 bg-rose-50/70",
        !isMismatch &&
          assignedPeerId &&
          !useEvenSplit &&
          "border-teal-200 bg-teal-50/70",
        !isMismatch &&
          !(assignedPeerId && !useEvenSplit) &&
          "hover:border-border",
      )}
    >
      <div className="flex items-start gap-2">
        <ImageViewer
          title={displayName}
          src={candidate.profileImage || null}
          fallbackSrc={DEFAULT_PROFILE_IMAGE}
          className="h-9 w-9 shrink-0 rounded-full border border-border"
          ariaLabel={`Photo of ${displayName}`}
          enableHoverPreview
          hoverPosition="right"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-foreground">
            {displayName}
          </p>
          <div className="mt-0.5 flex flex-wrap items-center gap-1">
            <Badge
              variant="outline"
              className="border-teal-200 bg-teal-50 px-1.5 py-0 text-[10px] font-medium text-teal-800"
            >
              {candidate.statusName}
            </Badge>
            {isMismatch && (
              <Badge
                variant="outline"
                className="border-rose-200 bg-rose-50 px-1.5 py-0 text-[10px] font-medium text-rose-800"
              >
                Can't hand over
              </Badge>
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1">
            <span className="truncate text-[10px] text-muted-foreground">
              {candidate.professionLabel}
            </span>
            {candidateSectorLabel && (
              <Badge
                variant="outline"
                className="border-border bg-muted px-1 py-0 text-[10px] font-medium text-foreground"
              >
                {candidateSectorLabel}
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="min-w-0 space-y-1">
        {phone ? (
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Phone className="h-3 w-3 shrink-0 text-slate-400" aria-hidden />
            <span className="truncate">{phone}</span>
          </span>
        ) : (
          <span className="text-[10px] text-slate-400">No phone</span>
        )}
        {candidate.email ? (
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Mail className="h-3 w-3 shrink-0 text-slate-400" aria-hidden />
            <span className="truncate">{candidate.email}</span>
          </span>
        ) : (
          <span className="text-[10px] text-slate-400">No email</span>
        )}
      </div>

      {selectedPeers.length > 0 && (
        <label className="mt-auto flex flex-col gap-0.5">
          <span className="sr-only">Assign {displayName} to recruiter</span>
          <select
            value={useEvenSplit ? "" : (assignedPeerId ?? "")}
            onChange={(e) => {
              if (e.target.value) onAssign(e.target.value);
            }}
            aria-label={`Assign ${displayName} to recruiter`}
            className="h-7 w-full rounded-md border border-border bg-background px-1.5 text-[10px] text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="" disabled>
              {useEvenSplit ? "Auto split" : "Select peer..."}
            </option>
            {selectedPeers.map((peer) => (
              <option key={peer.id} value={peer.id}>
                {peer.name}
              </option>
            ))}
          </select>
        </label>
      )}
    </article>
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
  const [destinationCountryCode, setDestinationCountryCode] = useState("");
  const [selectedPeers, setSelectedPeers] = useState<SelectedPeer[]>([]);
  const [useEvenSplit, setUseEvenSplit] = useState(true);
  const [candidateAssignments, setCandidateAssignments] = useState<
    Record<string, string>
  >({});
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
  const positiveCandidateProfessions =
    preview?.positiveCandidateProfessions ?? [];
  const peerRecruiters = peersData?.data?.peers ?? [];
  const peersPagination = peersData?.data?.pagination;
  const sourceCountryCodes = preview?.sourceCountryCodes ?? [];
  const pagination = preview?.pagination;
  const requiresHandoff = preview?.requiresCandidateHandoff ?? false;

  const candidateTotalPages = Math.max(1, pagination?.totalPages ?? 1);
  const totalPositive = pagination?.total ?? 0;
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

  const assignedCount = Object.keys(candidateAssignments).length;

  const candidateProfessionById = useMemo(() => {
    const map = new Map<string, PositiveCandidateProfession>();
    for (const entry of positiveCandidateProfessions) {
      map.set(entry.id, entry);
    }
    return map;
  }, [positiveCandidateProfessions]);

  const unmatchedCount = useMemo(() => {
    if (!useEvenSplit || selectedPeers.length === 0) return 0;
    return positiveCandidateProfessions.filter(
      (entry) =>
        !selectedPeers.some((peer) =>
          peerHandlesProfession(peer, {
            id: entry.professionTypeId,
            sector: entry.sector,
          }),
        ),
    ).length;
  }, [useEvenSplit, selectedPeers, positiveCandidateProfessions]);

  const professionMismatchCount = useMemo(() => {
    if (useEvenSplit) return 0;
    let count = 0;
    for (const [candidateId, peerId] of Object.entries(candidateAssignments)) {
      const profession = candidateProfessionById.get(candidateId);
      if (!profession) continue;
      const peer = selectedPeers.find((p) => p.id === peerId);
      if (
        !peer ||
        !peerHandlesProfession(peer, {
          id: profession.professionTypeId,
          sector: profession.sector,
        })
      ) {
        count += 1;
      }
    }
    return count;
  }, [
    useEvenSplit,
    candidateAssignments,
    candidateProfessionById,
    selectedPeers,
  ]);

  const evenSplitCounts = useMemo(() => {
    if (positiveCandidateProfessions.length === 0) {
      return previewEvenSplitCounts(
        totalPositive,
        selectedPeers.map((p) => p.id),
      );
    }
    return previewProfessionAwareEvenSplitCounts(
      positiveCandidateProfessions,
      selectedPeers,
    );
  }, [totalPositive, selectedPeers, positiveCandidateProfessions]);

  const manualBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const peerId of Object.values(candidateAssignments)) {
      counts[peerId] = (counts[peerId] ?? 0) + 1;
    }
    return counts;
  }, [candidateAssignments]);

  useEffect(() => {
    if (!open) {
      setStep("form");
      setDestinationCountryCode("");
      setSelectedPeers([]);
      setUseEvenSplit(true);
      setCandidateAssignments({});
      setPeerSearch("");
      setPeerDropdownOpen(false);
      setPeerPage(1);
      setReason("");
      setCandidatePage(1);
      setSelectionInitialized(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open || !preview || selectionInitialized) return;
    setSelectedPeers([]);
    setUseEvenSplit(true);
    setCandidateAssignments({});
    setDestinationCountryCode("");
    setReason("");
    setStep("form");
    setSelectionInitialized(true);
  }, [open, preview, selectionInitialized]);

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

  const togglePeer = (peer: TransferPreviewPeer) => {
    setSelectedPeers((prev) => {
      const exists = prev.some((p) => p.id === peer.id);
      if (exists) {
        const next = prev.filter((p) => p.id !== peer.id);
        setCandidateAssignments((assignments) => {
          const filtered: Record<string, string> = {};
          for (const [candId, peerId] of Object.entries(assignments)) {
            if (peerId !== peer.id) filtered[candId] = peerId;
          }
          return filtered;
        });
        return next;
      }
      return [
        ...prev,
        {
          id: peer.id,
          name: peer.name,
          profileImage: peer.profileImage,
          positiveCandidateCount: peer.positiveCandidateCount,
          professionScopes: peer.professionScopes,
          sectorScopes: peer.sectorScopes,
          handlesAllProfessions: peer.handlesAllProfessions,
          recruiterSectorScope: peer.recruiterSectorScope,
        },
      ];
    });
    setUseEvenSplit(true);
  };

  const removePeer = (peerId: string) => {
    setSelectedPeers((prev) => prev.filter((p) => p.id !== peerId));
    setCandidateAssignments((assignments) => {
      const filtered: Record<string, string> = {};
      for (const [candId, assignedPeerId] of Object.entries(assignments)) {
        if (assignedPeerId !== peerId) filtered[candId] = assignedPeerId;
      }
      return filtered;
    });
    setUseEvenSplit(true);
  };

  const assignCandidate = (candidateId: string, peerId: string) => {
    setUseEvenSplit(false);
    setCandidateAssignments((prev) => ({ ...prev, [candidateId]: peerId }));
  };

  const enableEvenSplit = () => {
    setUseEvenSplit(true);
    setCandidateAssignments({});
  };

  const canProceedToConfirm =
    Boolean(destinationCountryCode) &&
    Boolean(reason.trim()) &&
    (!requiresHandoff ||
      (selectedPeers.length > 0 &&
        (useEvenSplit
          ? unmatchedCount === 0
          : assignedCount === totalPositive && professionMismatchCount === 0)));

  const reviewBlockedReasons = useMemo(() => {
    const reasons: string[] = [];
    if (isLoading) {
      reasons.push("Transfer preview is still loading.");
      return reasons;
    }
    if (requiresHandoff && selectedPeers.length === 0) {
      reasons.push("Select at least one peer recruiter.");
    }
    if (
      requiresHandoff &&
      selectedPeers.length > 0 &&
      !useEvenSplit &&
      assignedCount < totalPositive
    ) {
      reasons.push(
        `Assign every positive candidate (${assignedCount}/${totalPositive}) or use Auto split.`,
      );
    }
    if (
      requiresHandoff &&
      selectedPeers.length > 0 &&
      useEvenSplit &&
      unmatchedCount > 0
    ) {
      reasons.push(
        unmatchedCount === 1
          ? "1 candidate can't be handed over. Select a recruiter who handles their job type."
          : `${unmatchedCount} candidates can't be handed over. Select recruiters who handle their job types.`,
      );
    }
    if (
      requiresHandoff &&
      selectedPeers.length > 0 &&
      !useEvenSplit &&
      professionMismatchCount > 0
    ) {
      reasons.push(
        professionMismatchCount === 1
          ? "1 candidate is assigned to the wrong recruiter. Choose someone who handles their job type."
          : `${professionMismatchCount} candidates are assigned to the wrong recruiter. Choose people who handle their job types.`,
      );
    }
    if (!destinationCountryCode) {
      reasons.push("Select a destination country.");
    }
    if (!reason.trim()) {
      reasons.push("Enter a reason for the transfer.");
    }
    return reasons;
  }, [
    isLoading,
    requiresHandoff,
    selectedPeers.length,
    useEvenSplit,
    assignedCount,
    totalPositive,
    unmatchedCount,
    professionMismatchCount,
    destinationCountryCode,
    reason,
  ]);

  const isReviewDisabled = !canProceedToConfirm || isLoading;
  const handleConfirm = async () => {
    try {
      const result = await transferCoverage({
        sourceCountryCode,
        userId,
        destinationCountryCode,
        ...(requiresHandoff
          ? useEvenSplit
            ? {
                evenSplitAcrossRecruiterIds: selectedPeers.map((p) => p.id),
              }
            : {
                assignments: buildManualAssignments(candidateAssignments),
              }
          : {}),
        reason: reason.trim(),
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
      <DialogContent className="flex h-[min(48rem,90vh)] w-[calc(100vw-1.5rem)] max-w-5xl flex-col gap-0 overflow-hidden p-0 sm:max-w-5xl">
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
                <span className="font-semibold text-foreground">{userName}</span>{" "}
                from{" "}
                <span className="font-semibold text-foreground">
                  {sourceCountryCode}
                </span>{" "}
                to another country
                {requiresHandoff
                  ? " after handing off all positive candidates to one or more peers."
                  : "."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5 pb-8">
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
                <section
                  className="space-y-3"
                  aria-labelledby="positive-candidates-heading"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <Label
                        id="positive-candidates-heading"
                        className="text-sm font-semibold text-foreground"
                      >
                        Positive candidates{" "}
                        <span className="text-destructive">*</span>
                      </Label>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        All {totalPositive} must be handed off. Use auto split
                        across selected peers, or assign each candidate.
                      </p>
                    </div>
                    {selectedPeers.length > 0 && (
                      <Button
                        type="button"
                        variant={useEvenSplit ? "default" : "outline"}
                        size="sm"
                        className="h-8 gap-1.5 text-xs"
                        onClick={enableEvenSplit}
                      >
                        <Split className="h-3.5 w-3.5" aria-hidden />
                        Auto split
                      </Button>
                    )}
                  </div>

                  {!useEvenSplit && assignedCount < totalPositive && (
                    <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                      <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      Assigned {assignedCount} of {totalPositive}. Assign every
                      positive candidate (all pages) or use auto split.
                    </div>
                  )}

                  {useEvenSplit && unmatchedCount > 0 && (
                    <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-900">
                      <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      {unmatchedCount === 1
                        ? "1 candidate can't be handed over yet. Select a recruiter who handles their job type (for example Nurse or Driver)."
                        : `${unmatchedCount} candidates can't be handed over yet. Select recruiters who handle their job types (for example Nurse or Driver).`}
                    </div>
                  )}

                  <div className="flex h-64 shrink-0 flex-col overflow-hidden rounded-xl border border-border bg-muted/50 shadow-sm sm:h-72">
                    <div className="relative min-h-0 flex-1 overflow-y-auto p-3">
                      {isFetching && (
                        <div className="absolute inset-0 z-10 flex items-center justify-center bg-card/60">
                          <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                        </div>
                      )}
                      {positiveCandidates.length === 0 ? (
                        <div className="flex h-full min-h-[14rem] items-center justify-center px-3 text-center text-sm text-muted-foreground">
                          No positive candidates on this page.
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                          {positiveCandidates.map((c) => (
                            <CandidateCard
                              key={c.id}
                              candidate={c}
                              selectedPeers={selectedPeers}
                              assignedPeerId={candidateAssignments[c.id]}
                              useEvenSplit={useEvenSplit}
                              onAssign={(peerId) =>
                                assignCandidate(c.id, peerId)
                              }
                            />
                          ))}
                        </div>
                      )}
                    </div>

                    {totalPositive > CANDIDATES_PAGE_SIZE && (
                      <div className="flex shrink-0 flex-col gap-2 border-t border-border bg-muted/80 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-xs text-muted-foreground">
                          Showing{" "}
                          <span className="font-semibold text-foreground">
                            {showingFrom}
                          </span>
                          –
                          <span className="font-semibold text-foreground">
                            {showingTo}
                          </span>{" "}
                          of{" "}
                          <span className="font-semibold text-foreground">
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
                          <span className="min-w-[4.5rem] text-center text-xs text-muted-foreground">
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
                    <Label className="text-sm font-semibold text-foreground">
                      Transfer to recruiter(s){" "}
                      <span className="text-destructive">*</span>
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Active recruiters who cover {sourceCountryCode}. Select
                      one or more.
                    </p>

                    {selectedPeers.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {selectedPeers.map((peer) => (
                          <span
                            key={peer.id}
                            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted py-1 pl-1 pr-2 text-xs text-foreground"
                          >
                            <ImageViewer
                              title={peer.name}
                              src={peer.profileImage || null}
                              fallbackSrc={DEFAULT_PROFILE_IMAGE}
                              className="h-5 w-5 rounded-full border border-border"
                              ariaLabel={`Photo of ${peer.name}`}
                            />
                            <span className="max-w-[8rem] min-w-0">
                              <span className="block truncate">{peer.name}</span>
                              {(peer.handlesAllProfessions ||
                                peer.professionScopes.length > 0) && (
                                <span className="block truncate text-[10px] text-muted-foreground">
                                  {formatPeerProfessionsSummary(peer)}
                                </span>
                              )}
                            </span>
                            {useEvenSplit && (
                              <Badge
                                variant="outline"
                                className="border-teal-200 bg-teal-50 px-1 py-0 text-[10px] text-teal-800"
                              >
                                {evenSplitCounts[peer.id] ?? 0}
                              </Badge>
                            )}
                            <button
                              type="button"
                              onClick={() => removePeer(peer.id)}
                              className="rounded-full p-0.5 text-slate-400 hover:bg-muted hover:text-foreground"
                              aria-label={`Remove ${peer.name}`}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}

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
                            selectedPeers.length > 0
                              ? "truncate text-foreground"
                              : "text-muted-foreground"
                          }
                        >
                          {selectedPeers.length > 0
                            ? `${selectedPeers.length} peer${selectedPeers.length === 1 ? "" : "s"} selected`
                            : "Select peer recruiters..."}
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
                          <div className="flex items-center gap-2 border-b border-border p-2">
                            <div className="relative min-w-0 flex-1">
                              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                              <Input
                                autoFocus
                                placeholder="Search recruiters..."
                                value={peerSearch}
                                onChange={(e) => setPeerSearch(e.target.value)}
                                className="h-8 pl-8 pr-2 text-sm"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => setPeerDropdownOpen(false)}
                              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                              aria-label="Close peer recruiter dropdown"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                          <div
                            className="relative max-h-52 overflow-y-auto"
                            role="listbox"
                            aria-label="Peer recruiters"
                            aria-multiselectable="true"
                          >
                            {(isPeersLoading || isPeersFetching) && (
                              <div className="absolute inset-0 z-10 flex items-center justify-center bg-card/60">
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
                                const isSelected = selectedPeers.some(
                                  (p) => p.id === peer.id,
                                );
                                return (
                                  <button
                                    key={peer.id}
                                    type="button"
                                    role="option"
                                    aria-selected={isSelected}
                                    aria-label={formatPeerOptionAriaLabel(peer)}
                                    onClick={() => togglePeer(peer)}
                                    className={cn(
                                      "flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm",
                                      isSelected
                                        ? "bg-teal-50"
                                        : "hover:bg-muted",
                                    )}
                                  >
                                    <ImageViewer
                                      title={peer.name}
                                      src={peer.profileImage || null}
                                      fallbackSrc={DEFAULT_PROFILE_IMAGE}
                                      className="h-9 w-9 shrink-0 rounded-full border border-border"
                                      ariaLabel={`Photo of ${peer.name}`}
                                    />
                                    <div className="min-w-0 flex-1">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <div className="truncate font-medium text-foreground">
                                          {peer.name}
                                        </div>
                                        <Badge
                                          variant="outline"
                                          className="shrink-0 border-teal-200 bg-teal-50 text-[10px] font-medium text-teal-800"
                                        >
                                          {peer.positiveCandidateCount} positive
                                        </Badge>
                                      </div>
                                      <div className="truncate text-xs text-muted-foreground">
                                        {formatPhone(
                                          peer.phoneCountryCode,
                                          peer.mobileNumber,
                                        ) ?? "No phone"}
                                      </div>
                                      {(peer.professionScopes.length > 0 ||
                                        peer.sectorScopes.length > 0) && (
                                        <div className="mt-1 flex flex-wrap gap-1">
                                          {peer.professionScopes
                                            .slice(0, 3)
                                            .map((scope) => (
                                              <Badge
                                                key={scope.id}
                                                variant="outline"
                                                className="border-border bg-muted px-1 py-0 text-[10px] font-medium text-foreground"
                                              >
                                                {scope.label}
                                              </Badge>
                                            ))}
                                          {peer.professionScopes.length > 3 && (
                                            <Badge
                                              variant="outline"
                                              className="border-border bg-muted px-1 py-0 text-[10px] font-medium text-foreground"
                                            >
                                              +{peer.professionScopes.length - 3}
                                            </Badge>
                                          )}
                                          {peer.sectorScopes.map((sector) => {
                                            const label = sectorLabel(sector);
                                            if (!label) return null;
                                            return (
                                              <Badge
                                                key={sector}
                                                variant="outline"
                                                className="border-teal-200 bg-teal-50 px-1 py-0 text-[10px] font-medium text-teal-800"
                                              >
                                                {label}
                                              </Badge>
                                            );
                                          })}
                                        </div>
                                      )}
                                      <div className="mt-1 flex flex-wrap gap-1">
                                        {peer.coveredCountryCodes
                                          .slice(0, 4)
                                          .map((code) => (
                                            <span
                                              key={code}
                                              className="inline-flex items-center gap-1 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] text-foreground"
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
                            <div className="flex items-center justify-between gap-2 border-t border-border bg-muted/80 px-2 py-2">
                              <span className="text-[11px] text-muted-foreground">
                                Page {safePeerPage} of {peerTotalPages}
                              </span>
                              <div className="flex items-center gap-1">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-7 gap-1 px-2 text-[11px]"
                                  disabled={
                                    safePeerPage <= 1 || isPeersFetching
                                  }
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
                  <Label className="text-sm font-semibold text-foreground">
                    Destination country{" "}
                    <span className="text-destructive">*</span>
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Country this recruiter will cover after transfer. You can
                    also select GCC to cover all GCC countries.
                  </p>
                  <CountrySelect
                    value={destinationCountryCode}
                    onValueChange={(code) => {
                      if (destinationOverlapsSource(code, sourceCountryCodes)) {
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
                    includeGccOption
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="coverage-transfer-reason"
                  className="text-sm font-semibold text-foreground"
                >
                  Reason <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="coverage-transfer-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. GCC has no open projects; Ireland has multiple"
                  rows={2}
                  maxLength={500}
                  required
                  aria-required="true"
                  className="resize-none"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-5 text-sm text-foreground">
              <div className="rounded-xl border border-teal-200 bg-teal-50/80 px-4 py-3.5">
                <p className="text-base font-semibold leading-snug text-foreground">
                  Move {userName} from {sourceCountryCode} to{" "}
                  {destinationCountryCode === "GCC"
                    ? "GCC"
                    : destinationCountryCode}
                </p>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {requiresHandoff
                    ? `First, hand off all ${totalPositive} positive candidate${totalPositive === 1 ? "" : "s"} to ${selectedPeers.length === 1 ? "a peer recruiter" : `${selectedPeers.length} peer recruiters`}. Then update ${userName}'s country coverage.`
                    : `No positive candidates to hand off. ${userName}'s country coverage will move directly.`}
                </p>
              </div>

              {requiresHandoff && selectedPeers.length > 0 && (
                <section
                  className="space-y-3"
                  aria-labelledby="confirm-handoff-heading"
                >
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-teal-600 text-xs font-bold text-white">
                      1
                    </span>
                    <h3
                      id="confirm-handoff-heading"
                      className="text-sm font-semibold text-foreground"
                    >
                      Hand off positive candidates
                      {useEvenSplit ? " (auto split)" : " (manual)"}
                    </h3>
                  </div>
                  <p className="pl-8 text-xs text-muted-foreground">
                    These candidates leave {userName}&apos;s list and move to the
                    peer recruiters below.
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {selectedPeers.map((peer) => {
                      const count = useEvenSplit
                        ? (evenSplitCounts[peer.id] ?? 0)
                        : (manualBreakdown[peer.id] ?? 0);
                      if (!useEvenSplit && count === 0) return null;
                      const zeroReason =
                        useEvenSplit && count === 0
                          ? autoSplitZeroReason(
                              peer,
                              positiveCandidateProfessions,
                            )
                          : null;
                      return (
                        <div
                          key={peer.id}
                          className={cn(
                            "flex flex-col gap-2 rounded-xl border bg-card px-3 py-3 shadow-sm",
                            zeroReason
                              ? "border-amber-200 bg-amber-50/40"
                              : "border-border",
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <ImageViewer
                              title={peer.name}
                              src={peer.profileImage || null}
                              fallbackSrc={DEFAULT_PROFILE_IMAGE}
                              className="h-10 w-10 shrink-0 rounded-full border border-border"
                              ariaLabel={`Photo of ${peer.name}`}
                            />
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-semibold text-foreground">
                                {peer.name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Receives{" "}
                                <span
                                  className={cn(
                                    "font-semibold",
                                    count === 0
                                      ? "text-amber-800"
                                      : "text-teal-700",
                                  )}
                                >
                                  {count}
                                </span>{" "}
                                candidate{count === 1 ? "" : "s"}
                              </p>
                              {(peer.handlesAllProfessions ||
                                peer.professionScopes.length > 0) && (
                                <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                                  Handles: {formatPeerProfessionsSummary(peer)}
                                </p>
                              )}
                            </div>
                            <Badge
                              variant="outline"
                              className={cn(
                                "shrink-0",
                                count === 0
                                  ? "border-amber-200 bg-amber-50 text-amber-900"
                                  : "border-teal-200 bg-teal-50 text-teal-800",
                              )}
                            >
                              {count}
                            </Badge>
                          </div>
                          {zeroReason && (
                            <p className="rounded-md border border-amber-200 bg-amber-50 px-2.5 py-2 text-[11px] leading-relaxed text-amber-950">
                              {zeroReason}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              <section
                className="space-y-3"
                aria-labelledby="confirm-coverage-heading"
              >
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-teal-600 text-xs font-bold text-white">
                    {requiresHandoff ? "2" : "1"}
                  </span>
                  <h3
                    id="confirm-coverage-heading"
                    className="text-sm font-semibold text-foreground"
                  >
                    Update country coverage
                  </h3>
                </div>
                <p className="pl-8 text-xs text-muted-foreground">
                  {userName} will stop covering the source countries and start
                  covering the destination.
                </p>

                <div className="flex flex-col items-stretch gap-3 rounded-xl border border-border bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 flex-1 space-y-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                      From
                    </p>
                    <p className="text-lg font-semibold text-foreground">
                      {sourceCountryCode}
                    </p>
                    {preview.currentCoverages.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {preview.currentCoverages.map((c) => (
                          <span
                            key={c.countryCode}
                            className="inline-flex items-center gap-1 rounded border border-rose-200 bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-800"
                          >
                            <FlagIcon
                              countryCode={c.countryCode}
                              size="sm"
                            />
                            {c.countryName}
                          </span>
                        ))}
                      </div>
                    )}
                    <p className="text-xs text-rose-700">
                      Coverage removed after transfer
                    </p>
                  </div>

                  <div className="flex justify-center sm:px-2">
                    <div className="rounded-full bg-teal-100 p-2">
                      <ArrowRight className="h-5 w-5 text-teal-700" aria-hidden />
                    </div>
                  </div>

                  <div className="min-w-0 flex-1 space-y-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                      To
                    </p>
                    <p className="text-lg font-semibold text-foreground">
                      {destinationCountryCode === "GCC"
                        ? "GCC"
                        : destinationCountryCode}
                    </p>
                    {destinationCountryCode === "GCC" ? (
                      <div className="flex flex-wrap gap-1.5">
                        {GCC_DESTINATION_CODES.map((code) => (
                          <span
                            key={code}
                            className="inline-flex items-center gap-1 rounded border border-teal-200 bg-teal-50 px-2 py-0.5 text-xs font-medium text-teal-800"
                          >
                            <FlagIcon countryCode={code} size="sm" />
                            {code}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded border border-teal-200 bg-teal-50 px-2 py-0.5 text-xs font-medium text-teal-800">
                        <FlagIcon
                          countryCode={destinationCountryCode}
                          size="sm"
                        />
                        {destinationCountryCode}
                      </span>
                    )}
                    <p className="text-xs text-teal-800">
                      New coverage for {userName}
                    </p>
                  </div>
                </div>
              </section>

              {reason.trim() && (
                <section className="rounded-xl border border-border bg-muted px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    Reason
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-foreground">
                    {reason.trim()}
                  </p>
                </section>
              )}

              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs leading-relaxed text-amber-950">
                <span className="font-semibold">Please confirm:</span> this
                cannot be undone from this screen. Candidates and coverage will
                update immediately, and {userName}
                {requiresHandoff && selectedPeers.length > 0
                  ? ` plus ${selectedPeers.map((p) => p.name).join(", ")}`
                  : ""}{" "}
                will be notified.
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="shrink-0 gap-2 border-t border-border bg-muted/60 px-6 py-5 pb-6 sm:gap-2">
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
                  "Confirm & transfer"
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
              <Tooltip>
                <TooltipTrigger asChild>
                  <span
                    className={cn(isReviewDisabled && "inline-flex cursor-not-allowed")}
                    tabIndex={isReviewDisabled ? 0 : undefined}
                  >
                    <Button
                      type="button"
                      onClick={() => setStep("confirm")}
                      disabled={isReviewDisabled}
                      className={cn(isReviewDisabled && "pointer-events-none")}
                      aria-describedby={
                        isReviewDisabled
                          ? "transfer-review-blocked-reasons"
                          : undefined
                      }
                    >
                      Review &amp; confirm
                    </Button>
                  </span>
                </TooltipTrigger>
                {isReviewDisabled && (
                  <TooltipContent
                    side="top"
                    id="transfer-review-blocked-reasons"
                    className="max-w-xs space-y-1.5 border border-border bg-card p-3 text-foreground shadow-lg"
                  >
                    <p className="text-xs font-semibold text-foreground">
                      Complete these to continue:
                    </p>
                    <ul className="list-disc space-y-1 pl-4 text-xs text-foreground">
                      {reviewBlockedReasons.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </TooltipContent>
                )}
              </Tooltip>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
