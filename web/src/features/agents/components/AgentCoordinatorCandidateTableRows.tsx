import {
  Eye,
  Mail,
  Edit,
  MoreHorizontal,
  Phone,
  Trash2,
  UserCheck,
  Calendar,
} from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TableCell, TableRow } from "@/components/ui/table";
import { ImageViewer } from "@/components/molecules";

function formatOverviewDate(dateString?: string) {
  if (!dateString) return "—";
  try {
    return format(new Date(dateString), "dd MMM yyyy HH:mm");
  } catch {
    return "—";
  }
}

function formatPhoneForLink(c: {
  countryCode?: string;
  mobileNumber?: string;
  mobile?: string;
  contact?: string;
}) {
  const raw =
    String(c?.countryCode ?? "") +
    String(c?.mobileNumber ?? c?.mobile ?? c?.contact ?? "");
  const digits = raw.replace(/\D/g, "");
  return digits || null;
}

const TABLE_COL_SPAN = 6;

export interface AgentCoordinatorCandidateTableRowsProps {
  candidates: any[];
  isLoading?: boolean;
  canWriteCandidates: boolean;
  canTransferCandidates: boolean;
  onTransfer: (
    candidate: any,
    recruiter: { id: string; name?: string; email?: string } | null,
  ) => void;
}

export function AgentCoordinatorCandidateTableRows({
  candidates,
  isLoading,
  canWriteCandidates,
  canTransferCandidates,
  onTransfer,
}: AgentCoordinatorCandidateTableRowsProps) {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <>
        {Array.from({ length: 5 }).map((_, i) => (
          <TableRow key={i} className="animate-pulse">
            <TableCell colSpan={TABLE_COL_SPAN} className="px-4 py-3">
              <div className="h-10 rounded bg-slate-100" />
            </TableCell>
          </TableRow>
        ))}
      </>
    );
  }

  if (candidates.length === 0) {
    return (
      <TableRow>
        <TableCell colSpan={TABLE_COL_SPAN} className="h-64 text-center">
          <div className="flex flex-col items-center justify-center">
            <UserCheck className="mb-4 h-12 w-12 text-slate-200" />
            <p className="font-medium text-slate-500">
              No candidates found for your agent-sourced assignments.
            </p>
          </div>
        </TableCell>
      </TableRow>
    );
  }

  return (
    <>
      {candidates.map((candidate: any) => {
        const activeAssignment = (
          candidate.recruiterAssignments || []
        )?.find((a: any) => a.isActive);
        const recruiter =
          activeAssignment?.recruiter ||
          candidate.recruiter ||
          null;
        const createdBy =
          candidate.createdBy ||
          candidate.candidateCreatedBy ||
          activeAssignment?.createdByUser ||
          null;

        /** From GET .../my-candidates (includes `agent` when agentId set) */
        const agentName: string | undefined = candidate.agent?.name;

        const phoneDigits = formatPhoneForLink(candidate);

        return (
          <TableRow
            key={candidate.id}
            className="group border-b border-gray-100 transition-colors last:border-b-0 hover:bg-gray-50/70"
          >
            <TableCell className="px-4 py-3">
              <div className="flex items-center gap-3">
                <ImageViewer
                  title={`${candidate.firstName} ${candidate.lastName}`}
                  src={candidate.profileImage || null}
                  fallbackSrc={
                    "https://img.freepik.com/free-vector/isolated-young-handsome-man-different-poses-white-background-illustration_632498-859.jpg"
                  }
                  className="h-10 w-10 rounded-full"
                  ariaLabel={`View full image for ${candidate.firstName} ${candidate.lastName}`}
                  enableHoverPreview={true}
                />
                <div className="min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/candidates/${candidate.id}`);
                    }}
                    className="block truncate text-xs font-semibold text-gray-900 transition-all duration-200 hover:text-blue-600 hover:underline"
                  >
                    {candidate.firstName} {candidate.lastName}
                  </button>
                  <div className="mt-0.5 truncate text-[11px] font-medium text-slate-500">
                    {candidate.currentRole || ""}
                  </div>
                  <div className="mt-1.5 space-y-0.5 text-[11px] text-slate-500">
                    {candidate.email && (
                      <div className="flex items-center gap-1.5">
                        <Mail className="h-3 w-3 text-gray-400" />
                        <span className="truncate text-gray-700">
                          {candidate.email}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5">
                      <Phone className="h-3 w-3 text-gray-400" />
                      <span className="text-gray-700">
                        {candidate.countryCode} {candidate.mobileNumber}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </TableCell>

            <TableCell className="px-4 py-3">
              <div className="text-xs">
                {createdBy?.name ? (
                  <div className="space-y-0.5">
                    <div className="max-w-[120px] truncate font-medium text-slate-900">
                      {createdBy.name}
                    </div>
                    {createdBy.email && (
                      <div className="flex items-center gap-1.5 text-slate-700">
                        <Mail className="h-3 w-3 text-gray-400" />
                        <span className="max-w-[120px] truncate">
                          {createdBy.email}
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <span className="text-[10px] text-slate-500">System / Admin</span>
                )}
              </div>
            </TableCell>

            <TableCell className="px-4 py-3">
              <span className="text-xs font-medium text-slate-900">
                {agentName?.trim() ? agentName.trim() : "—"}
              </span>
            </TableCell>

            <TableCell className="px-4 py-3">
              <div className="flex items-center gap-1.5 text-xs text-gray-600">
                <Calendar className="h-3.5 w-3.5 text-gray-400" />
                {formatOverviewDate(candidate.createdAt)}
              </div>
            </TableCell>

            <TableCell className="px-4 py-3 text-center">
              <div className="flex items-center justify-center gap-1.5">
                <Button
                  type="button"
                  variant="ghost"
                  className="flex h-7 w-7 items-center justify-center rounded-full p-0 text-green-600 shadow-sm transition-all hover:bg-green-100"
                  onClick={() =>
                    phoneDigits &&
                    window.open(`https://wa.me/${phoneDigits}`, "_blank")
                  }
                  disabled={!phoneDigits}
                  title="WhatsApp"
                >
                  <FaWhatsapp className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="flex h-7 w-7 items-center justify-center rounded-full p-0 text-blue-600 shadow-sm transition-all hover:bg-blue-100"
                  onClick={() =>
                    phoneDigits &&
                    (window.location.href = `tel:${phoneDigits}`)
                  }
                  disabled={!phoneDigits}
                  title="Call"
                >
                  <Phone className="h-4 w-4" />
                </Button>
              </div>
            </TableCell>

            <TableCell className="px-4 py-3 text-right">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 hover:bg-slate-100"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40 border-0 shadow-xl">
                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => navigate(`/candidates/${candidate.id}`)}
                  >
                    <Eye className="mr-2 h-4 w-4" /> View Details
                  </DropdownMenuItem>
                  {canWriteCandidates && (
                    <>
                      <DropdownMenuItem
                        onClick={() =>
                          navigate(`/candidates/${candidate.id}/edit`)
                        }
                      >
                        <Edit className="mr-2 h-4 w-4" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-red-500">
                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                      </DropdownMenuItem>
                    </>
                  )}
                  {canTransferCandidates && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => onTransfer(candidate, recruiter)}
                        className="text-blue-600"
                      >
                        <UserCheck className="mr-2 h-4 w-4" /> Transfer
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        );
      })}
    </>
  );
}
