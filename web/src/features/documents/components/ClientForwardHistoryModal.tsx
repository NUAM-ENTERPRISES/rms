import React, { useState } from "react";
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
  Filter
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useGetForwardingHistoryQuery } from "../api";
import { formatDistanceToNow, format } from "date-fns";
import { useDebounce } from "@/hooks/useDebounce";

interface ClientForwardHistoryModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  candidateId: string;
  projectId: string;
  roleCatalogId?: string;
  candidateName: string;
}

export function ClientForwardHistoryModal({
  isOpen,
  onOpenChange,
  candidateId,
  projectId,
  roleCatalogId,
  candidateName,
}: ClientForwardHistoryModalProps) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);

  const { data: historyResponse, isLoading } = useGetForwardingHistoryQuery(
    { 
      candidateId, 
      projectId, 
      roleCatalogId, 
      page, 
      limit: 5,
      search: debouncedSearch 
    },
    { skip: !isOpen }
  );

  const history = historyResponse?.data?.items || [];
  const meta = historyResponse?.data?.meta;

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
          <p className="text-slate-400 text-sm mt-1">
            Audit trail of documents sent for {candidateName}.
          </p>
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
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-slate-400" />
                      <span className="font-bold text-slate-800 break-all">{item.recipientEmail}</span>
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
                      <span>Type: <Badge variant="secondary" className="text-[10px] capitalize px-1 py-0">{item.sendType}</Badge></span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600 col-span-2">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>{safeFormatDate(item.sentAt || item.createdAt)}</span>
                    </div>
                  </div>

                  {item.notes && (
                    <div className="bg-slate-50 p-3 rounded-lg text-xs text-slate-600 border border-slate-100 italic">
                      "{item.notes}"
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
