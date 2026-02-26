import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  History, 
  Search, 
  Mail, 
  User, 
  Calendar, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  FileText,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Filter,
  ExternalLink,
  Link as LinkIcon,
  Database
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useGetForwardingHistoryQuery } from "../api";
import { format } from "date-fns";
import { useDebounce } from "@/hooks/useDebounce";
import { ImageViewer } from "@/components/molecules/ImageViewer";

interface ClientForwardHistoryModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  candidateId?: string;
  roleCatalogId?: string;
  candidateName?: string;
}

export function ClientForwardHistoryModal({
  isOpen,
  onOpenChange,
  projectId,
  candidateId,
  roleCatalogId,
  candidateName,
}: ClientForwardHistoryModalProps) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);

  const { data: historyResponse, isLoading } = useGetForwardingHistoryQuery(
    { 
      projectId,
      candidateId, 
      roleCatalogId, 
      page, 
      limit: 5,
      search: debouncedSearch 
    },
    { skip: !isOpen }
  );

  const history = historyResponse?.data?.items || [];
  const meta = historyResponse?.data?.meta;
  const project = historyResponse?.data?.project;

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "sent":
        return <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white gap-1"><CheckCircle2 className="h-3 w-3" /> Sent</Badge>;
      case "failed":
        return <Badge className="bg-red-500 hover:bg-red-600 text-white gap-1"><XCircle className="h-3 w-3" /> Failed</Badge>;
      default:
        return <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" /> {status}</Badge>;
    }
  };

  const getDeliveryBadge = (method?: string) => {
    switch (method?.toLowerCase()) {
      case "email_individual":
        return <Badge variant="outline" className="text-[9px] bg-sky-50 text-sky-700 border-sky-100 px-1.5 font-bold uppercase tracking-tight">Separate</Badge>;
      case "email_combined":
        return <Badge variant="outline" className="text-[9px] bg-indigo-50 text-indigo-700 border-indigo-100 px-1.5 font-bold uppercase tracking-tight">Combined</Badge>;
      case "google_drive":
        return <Badge variant="outline" className="text-[9px] bg-emerald-50 text-emerald-700 border-emerald-100 px-1.5 font-bold uppercase tracking-tight">G-Drive</Badge>;
      default:
        return null;
    }
  };

  const safeFormatDate = (dateStr?: string) => {
    if (!dateStr) return "N/A";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "Invalid date";
    return format(date, "MMM d, yyyy • h:mm a");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl p-0 overflow-hidden rounded-2xl border-none shadow-2xl">
        <DialogHeader className="p-6 bg-slate-900 text-white">
          <DialogTitle className="text-xl font-bold flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-lg">
              <History className="h-5 w-5 text-blue-400" />
            </div>
            Forwarding History
          </DialogTitle>
          <div className="mt-2 space-y-1">
            {project && (
              <p className="text-blue-400 text-xs font-bold uppercase tracking-wider">
                Project: {project.title} {project.client?.name ? `• ${project.client.name}` : ''}
              </p>
            )}
            <p className="text-slate-400 text-sm">
              Audit trail of documents sent{candidateName ? ` for ${candidateName}` : ' for this project'}.
            </p>
          </div>
        </DialogHeader>

        <div className="p-4 bg-slate-50 border-b border-slate-200 flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by email or notes..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9 h-10 border-slate-200 focus:ring-slate-500/20"
            />
          </div>
          <Button variant="outline" size="icon" className="h-10 w-10 shrink-0 border-slate-200">
            <Filter className="h-4 w-4 text-slate-600" />
          </Button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-4 space-y-4 bg-slate-50/50">
          {isLoading ? (
            <div className="py-20 text-center space-y-3">
              <div className="h-8 w-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin mx-auto" />
              <p className="text-slate-500 text-sm animate-pulse">Retrieving history...</p>
            </div>
          ) : history.length > 0 ? (
            history.map((item) => (
              <div key={item.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <ImageViewer 
                        src={item.candidate?.profileImage} 
                        title={`${item.candidate?.firstName || ''} ${item.candidate?.lastName || ''}`}
                        className="h-10 w-10 border border-slate-100 shadow-sm"
                        enableHoverPreview={true}
                      />
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-800">
                          {item.candidate?.firstName} {item.candidate?.lastName}
                        </span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Mail className="h-3 w-3 text-slate-400" />
                          <span className="text-[11px] text-slate-500 font-medium break-all">
                            To: <span className="text-slate-700">{item.recipientEmail}</span>
                          </span>
                        </div>
                      </div>
                    </div>
                    {getStatusBadge(item.status)}
                  </div>

                  <div className="grid grid-cols-2 gap-4 py-2 border-y border-slate-50 text-xs">
                    <div className="flex items-center gap-2 text-slate-600">
                      <User className="h-3.5 w-3.5" />
                      <span>Sent by <span className="font-semibold">{item.sender.name}</span></span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600">
                      <FileText className="h-3.5 w-3.5" />
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span>Format: <Badge variant="secondary" className="text-[10px] capitalize px-1 py-0">{item.sendType}</Badge></span>
                        {item.deliveryMethod && getDeliveryBadge(item.deliveryMethod)}
                        {item.isBulk && <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 text-[9px] px-1 py-0 border-blue-200">Bulk</Badge>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600 col-span-2">
                      <Calendar className="h-3.5 w-3.5" />
                      <div className="flex items-center justify-between w-full">
                        <span>{safeFormatDate(item.sentAt || item.createdAt)}</span>
                        {item.roleCatalog && (
                          <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded uppercase">
                            {item.roleCatalog.label}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {item.notes && (
                    <div className="bg-slate-50 p-3 rounded-lg text-xs text-slate-600 border border-slate-100 italic">
                      "{item.notes}"
                    </div>
                  )}

                  {(item.csvUrl || item.gdriveLink) && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {item.csvUrl && (
                        <a 
                          href={item.csvUrl} 
                          target="_blank" 
                          rel="noreferrer"
                          className="flex items-center gap-1.5 px-2 py-1 bg-amber-50 text-amber-700 border border-amber-100 rounded-md text-[10px] font-bold hover:bg-amber-100 transition-colors"
                        >
                          <Database className="h-3 w-3" />
                          View CSV Summary
                          <ExternalLink className="h-2.5 w-2.5 ml-0.5" />
                        </a>
                      )}
                      {item.gdriveLink && (
                        <a 
                          href={item.gdriveLink} 
                          target="_blank" 
                          rel="noreferrer"
                          className="flex items-center gap-1.5 px-2 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-md text-[10px] font-bold hover:bg-emerald-100 transition-colors"
                        >
                          <LinkIcon className="h-3 w-3" />
                          Google Drive Folder
                          <ExternalLink className="h-2.5 w-2.5 ml-0.5" />
                        </a>
                      )}
                    </div>
                  )}

                  {item.error && (
                    <div className="bg-red-50 p-2 rounded-lg flex items-start gap-2 text-[10px] text-red-700 border border-red-100">
                      <AlertCircle className="h-3 w-3 shrink-0 mt-0.5" />
                      <span>Error: {item.error}</span>
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="py-20 text-center bg-white rounded-2xl border-2 border-dashed border-slate-100">
              <History className="h-10 w-10 text-slate-200 mx-auto mb-3" />
              <h3 className="font-bold text-slate-400">No forwarding history</h3>
              <p className="text-slate-300 text-xs mt-1">Attempts will appear here once you send documents.</p>
            </div>
          )}
        </div>

        {meta && meta.totalPages > 1 && (
          <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between">
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
              Showing {history.length} of {meta.total} records
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0 rounded-lg"
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-xs font-bold text-slate-700 w-8 text-center">{page}</span>
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0 rounded-lg"
                disabled={page >= meta.totalPages}
                onClick={() => setPage(p => p + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
