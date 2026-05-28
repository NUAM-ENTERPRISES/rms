import React from "react";
import { Eye, Link2, FileX, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PDFViewer } from "@/components/molecules/PDFViewer";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useGetDocumentsQuery } from "../api";
import { useDebounce } from "@/hooks";

type BasicDocument = {
  id: string;
  docType: string;
  fileName: string;
  fileUrl: string;
  mimeType?: string | null;
  docName?: string | null;
  createdAt: string;
  fileSize?: number;
  roleCatalog?: {
    id?: string;
    name?: string;
    label?: string;
  } | null;
};

function isPdfDocument(doc: Pick<BasicDocument, "mimeType" | "fileName" | "fileUrl">) {
  return (
    doc.mimeType?.toLowerCase().includes("pdf") ||
    doc.fileName?.toLowerCase().endsWith(".pdf") ||
    doc.fileUrl?.toLowerCase().includes(".pdf")
  );
}

interface LinkExistingDocumentModalProps {
  isOpen: boolean;
  candidateId: string;
  docType: string;
  /** When set, only documents for this nominated role (and role-agnostic docs) are listed */
  roleCatalogId?: string;
  roleLabel?: string;
  isLinking?: boolean;
  onClose: () => void;
  onConfirm: (documentId: string) => void;
}

export function LinkExistingDocumentModal({
  isOpen,
  candidateId,
  docType,
  roleCatalogId,
  roleLabel,
  isLinking = false,
  onClose,
  onConfirm,
}: LinkExistingDocumentModalProps) {
  const [search, setSearch] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [limit] = React.useState(10);
  const [selectedDocumentId, setSelectedDocumentId] = React.useState("");
  const [previewDoc, setPreviewDoc] = React.useState<{
    fileUrl: string;
    fileName: string;
    isPdf: boolean;
  } | null>(null);
  const debouncedSearch = useDebounce(search, 300);

  const normalizedDocType = React.useMemo(() => {
    const raw = (docType || "").trim().toLowerCase();
    const aliases: Record<string, string> = {
      resum: "resume",
      resumes: "resume",
      cvs: "cv",
    };
    return aliases[raw] || raw;
  }, [docType]);

  React.useEffect(() => {
    if (!isOpen) {
      setSearch("");
      setPage(1);
      setSelectedDocumentId("");
      setPreviewDoc(null);
    }
  }, [isOpen]);

  const handleViewDocument = (
    event: React.MouseEvent,
    doc: BasicDocument,
  ) => {
    event.stopPropagation();
    if (!doc.fileUrl) return;

    setPreviewDoc({
      fileUrl: doc.fileUrl,
      fileName: doc.fileName,
      isPdf: isPdfDocument(doc),
    });
  };

  React.useEffect(() => {
    setPage(1);
  }, [search, normalizedDocType, candidateId, roleCatalogId]);

  const queryParams = React.useMemo(
    () => ({
      candidateId,
      docType: normalizedDocType,
      page,
      limit,
      roleCatalogId: roleCatalogId || undefined,
      search: debouncedSearch.trim() || undefined,
    }),
    [candidateId, normalizedDocType, page, limit, roleCatalogId, debouncedSearch],
  );

  const { data, isLoading } = useGetDocumentsQuery(queryParams, {
    skip: !isOpen || !candidateId || !normalizedDocType,
    refetchOnMountOrArgChange: true,
  });

  const paginatedDocs: BasicDocument[] = data?.data?.documents || [];
  const pagination = data?.data?.pagination;
  const total = pagination?.total || 0;
  const totalPages = pagination?.totalPages || 1;

  React.useEffect(() => {
    if (page > totalPages) setPage(1);
  }, [page, totalPages]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-violet-600" />
            Link Existing {docType}
          </DialogTitle>
          <DialogDescription>
            Select an existing {docType} from the candidate profile to link to this project
            {roleLabel ? ` for the ${roleLabel} role` : ""}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Search Documents</Label>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search ${docType} by file name or doc name`}
            />
          </div>

          <div className="border rounded-md overflow-hidden">
            <TooltipProvider>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[70px]">Pick</TableHead>
                    <TableHead className="w-[130px]">Doc Type</TableHead>
                    <TableHead className="w-[180px]">Role</TableHead>
                    <TableHead>Doc Name</TableHead>
                    <TableHead>File Name</TableHead>
                    <TableHead className="w-[160px]">Uploaded Date</TableHead>
                    <TableHead className="w-[120px]">Size</TableHead>
                    <TableHead className="w-[70px]">View</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={8}>
                        <div className="p-6 text-center text-sm text-muted-foreground">
                          <RefreshCw className="h-5 w-5 mx-auto mb-2 animate-spin opacity-70" />
                          Loading documents...
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : paginatedDocs.length > 0 ? (
                    paginatedDocs.map((doc) => (
                      <TableRow
                        key={doc.id}
                        className="cursor-pointer"
                        onClick={() => setSelectedDocumentId(doc.id)}
                      >
                        <TableCell>
                          <input
                            type="radio"
                            name="selectedExistingDocument"
                            checked={selectedDocumentId === doc.id}
                            onChange={() => setSelectedDocumentId(doc.id)}
                          />
                        </TableCell>
                        <TableCell className="capitalize">{doc.docType}</TableCell>
                        <TableCell>
                          {doc.roleCatalog?.label || doc.roleCatalog?.name || "—"}
                        </TableCell>
                        <TableCell>{doc.docName || "—"}</TableCell>
                        <TableCell>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="inline-block max-w-[320px] truncate align-bottom">
                                {doc.fileName}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs break-all">
                              {doc.fileName}
                            </TooltipContent>
                          </Tooltip>
                        </TableCell>
                        <TableCell>
                          {new Date(doc.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {doc.fileSize
                            ? `${(doc.fileSize / 1024 / 1024).toFixed(1)} MB`
                            : "—"}
                        </TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            title={`View ${doc.fileName}`}
                            aria-label={`View ${doc.fileName}`}
                            onClick={(event) => handleViewDocument(event, doc)}
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8}>
                        <div className="p-6 text-center text-sm text-muted-foreground">
                          <FileX className="h-8 w-8 mx-auto mb-2 opacity-20" />
                          No existing {docType} found.
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TooltipProvider>
          </div>

          {total > limit && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Showing {(page - 1) * limit + 1}-
                {Math.min(page * limit, total)} of {total}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Prev
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => onConfirm(selectedDocumentId)}
            disabled={!selectedDocumentId || isLinking}
            className="bg-violet-600 hover:bg-violet-700 text-white"
          >
            {isLinking ? (
              <RefreshCw className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Link2 className="h-4 w-4 mr-2" />
            )}
            Link Document
          </Button>
        </DialogFooter>
      </DialogContent>

      {previewDoc?.isPdf ? (
        <PDFViewer
          fileUrl={previewDoc.fileUrl}
          fileName={previewDoc.fileName}
          isOpen={!!previewDoc}
          onClose={() => setPreviewDoc(null)}
          showDownload
          showZoomControls
          showRotationControls
          showFullscreenToggle
        />
      ) : null}

      {previewDoc && !previewDoc.isPdf ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70"
          onClick={() => setPreviewDoc(null)}
          role="dialog"
          aria-modal="true"
          aria-label={`Preview ${previewDoc.fileName}`}
        >
          <div
            className="relative max-w-3xl w-full mx-4"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setPreviewDoc(null)}
              className="absolute -top-10 right-0 text-white hover:text-slate-300 text-sm font-medium"
            >
              Close
            </button>
            <img
              src={previewDoc.fileUrl}
              alt={previewDoc.fileName}
              className="w-full max-h-[80vh] object-contain rounded-xl shadow-2xl"
            />
          </div>
        </div>
      ) : null}
    </Dialog>
  );
}

