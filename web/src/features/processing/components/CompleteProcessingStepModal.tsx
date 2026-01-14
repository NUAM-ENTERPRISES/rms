import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Clock, FileCheck, Loader2, Eye, AlertCircle } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  isCompleting: boolean;
  requiredDocuments: any[];
  uploadsByDocType: Record<string, any[]>;
  candidateDocsByDocType: Record<string, any[]>;
  processingDocsByDocType: Record<string, any[]>;
  onViewDocument: (docType: string) => void;
}

export default function CompleteProcessingStepModal({
  isOpen,
  onClose,
  onConfirm,
  isCompleting,
  requiredDocuments,
  uploadsByDocType,
  candidateDocsByDocType,
  processingDocsByDocType,
  onViewDocument,
}: Props) {
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'verified':
        return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-rose-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-amber-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-slate-300" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0 h-5 px-1.5">Verified</Badge>;
      case 'rejected':
        return <Badge className="bg-rose-100 text-rose-700 hover:bg-rose-100 border-0 h-5 px-1.5">Rejected</Badge>;
      case 'pending':
        return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-0 h-5 px-1.5">Pending</Badge>;
      default:
        return <Badge className="bg-slate-100 text-slate-500 hover:bg-slate-100 border-0 h-5 px-1.5">Missing</Badge>;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-2xl flex flex-col p-0 overflow-hidden max-h-[85vh]">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <FileCheck className="h-6 w-6 text-indigo-600" />
            Complete Step Confirmation
          </DialogTitle>
          <DialogDescription>
            Review all documents before finalizing this processing step.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden px-6 py-2">
          <div className="bg-slate-50 border rounded-lg overflow-hidden flex flex-col max-h-full">
            <div className="bg-slate-200/50 px-4 py-2 border-b flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Document Verification Summary</span>
              <span className="text-[10px] text-slate-500">All mandatory documents must be verified</span>
            </div>
            
            <ScrollArea className="h-[400px]">
              <div className="divide-y">
                {requiredDocuments.map((req) => {
                  const pList = processingDocsByDocType[req.docType] || [];
                  const pDoc = pList[pList.length - 1];
                  const cList = candidateDocsByDocType[req.docType] || [];
                  const cDoc = cList[cList.length - 1];

                  const doc = pDoc || cDoc;
                  const status = doc?.status || 'missing';
                  
                  return (
                    <div key={req.docType} className="flex items-center justify-between gap-4 p-4 hover:bg-slate-100/50 transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        {getStatusIcon(status)}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold truncate text-slate-800">{req.label}</span>
                            {req.mandatory && (
                              <Badge variant="outline" className="text-[9px] uppercase border-rose-200 text-rose-600 bg-rose-50/50 h-4 px-1 leading-none font-bold">Required</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            {getStatusBadge(status)}
                            {doc?.fileName && (
                              <span className="text-[10px] text-slate-500 truncate max-w-[150px]">
                                • {doc.fileName}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {doc && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 shrink-0"
                          onClick={() => onViewDocument(req.docType)}
                        >
                          <Eye className="h-4 w-4 text-slate-500" />
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        </div>

        <DialogFooter className="p-6 bg-slate-50 border-t items-center mt-auto">
          <div className="flex-1 flex items-center gap-2 text-[12px] text-slate-500">
            <AlertCircle className="h-4 w-4 text-indigo-500 shrink-0" />
            Once marked complete, this step cannot be undone easily.
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={onClose} disabled={isCompleting}>
              Cancel
            </Button>
            <Button 
              onClick={onConfirm} 
              disabled={isCompleting}
              className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[120px]"
            >
              {isCompleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : 'Confirm Complete'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
