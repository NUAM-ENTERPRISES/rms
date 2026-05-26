import React from "react";
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
import { ChevronLeft, ChevronRight, Link2, Search } from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";
import { truncateFileName } from "@/lib/formatFileName";
import { useGetReusableIntroductionVideosQuery } from "@/features/introduction-videos/api";
import { cn } from "@/lib/utils";

export interface IntroductionVideoReuseModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidateId: string;
  excludeProjectId: string;
  onReuse: (documentId: string) => Promise<void>;
  isReusing?: boolean;
}

function TruncatedText({
  value,
  className,
}: {
  value: string;
  className?: string;
}) {
  const { display, full, isTruncated } = truncateFileName(value, 80);

  if (!isTruncated) {
    return <span className={className}>{display}</span>;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={cn("cursor-help", className)}>{display}</span>
        </TooltipTrigger>
        <TooltipContent className="max-w-md break-all">
          <p className="text-xs">{full}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function IntroductionVideoReuseModal({
  isOpen,
  onClose,
  candidateId,
  excludeProjectId,
  onReuse,
  isReusing = false,
}: IntroductionVideoReuseModalProps) {
  const [page, setPage] = React.useState(1);
  const [search, setSearch] = React.useState("");
  const [selectedDocumentId, setSelectedDocumentId] = React.useState("");
  const debouncedSearch = useDebounce(search, 300);

  React.useEffect(() => {
    if (!isOpen) {
      setPage(1);
      setSearch("");
      setSelectedDocumentId("");
    }
  }, [isOpen]);

  React.useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const { data, isLoading, isFetching } = useGetReusableIntroductionVideosQuery(
    {
      candidateId,
      page,
      limit: 10,
      search: debouncedSearch,
      excludeProjectId,
    },
    { skip: !isOpen || !candidateId }
  );

  const items = data?.data ?? [];
  const pagination = data?.pagination;

  const handleReuse = async () => {
    if (!selectedDocumentId) {
      return;
    }
    await onReuse(selectedDocumentId);
  };

  const formatUploadedDate = (value: string) =>
    new Date(value).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-violet-600" aria-hidden />
            Reuse Introduction Video
          </DialogTitle>
          <DialogDescription>
            Select an existing introduction video uploaded for this candidate.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by file name or remarks"
            className="pl-9"
            aria-label="Search introduction videos"
          />
        </div>

        <div className="min-h-0 flex-1 overflow-auto rounded-md border">
          {isLoading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Loading introduction videos...
            </div>
          ) : items.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No reusable introduction videos found for this candidate.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10" />
                  <TableHead>File Name</TableHead>
                  <TableHead>Remarks</TableHead>
                  <TableHead>Linked To</TableHead>
                  <TableHead>Uploaded At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow
                    key={item.documentId}
                    className={cn(
                      "cursor-pointer",
                      selectedDocumentId === item.documentId && "bg-violet-50"
                    )}
                    onClick={() => setSelectedDocumentId(item.documentId)}
                  >
                    <TableCell>
                      <input
                        type="radio"
                        name="reusable-intro-video"
                        checked={selectedDocumentId === item.documentId}
                        onChange={() => setSelectedDocumentId(item.documentId)}
                        aria-label={`Select ${item.fileName}`}
                      />
                    </TableCell>
                    <TableCell>
                      <TruncatedText
                        value={item.fileName}
                        className="text-sm font-medium"
                      />
                    </TableCell>
                    <TableCell>
                      {item.remarks ? (
                        <TruncatedText
                          value={item.remarks}
                          className="text-sm text-muted-foreground"
                        />
                      ) : (
                        <span className="text-sm text-muted-foreground italic">
                          —
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {item.isLibrary ? (
                        <Badge variant="outline" className="text-violet-700">
                          Candidate library
                        </Badge>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {item.linkedProjects.map((project) => (
                            <Badge
                              key={project.projectId}
                              variant="secondary"
                              className="text-xs"
                            >
                              {project.projectTitle}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatUploadedDate(item.uploadedAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        {pagination && pagination.totalPages > 1 ? (
          <div className="flex items-center justify-between pt-2">
            <p className="text-sm text-muted-foreground">
              Page {pagination.page} of {pagination.totalPages} ({pagination.total}{" "}
              total)
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page <= 1 || isFetching}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page >= pagination.totalPages || isFetching}
                onClick={() =>
                  setPage((current) =>
                    pagination.totalPages
                      ? Math.min(pagination.totalPages, current + 1)
                      : current + 1
                  )
                }
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        ) : null}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleReuse}
            disabled={!selectedDocumentId || isReusing}
          >
            {isReusing ? "Linking..." : "Link Video"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default IntroductionVideoReuseModal;
