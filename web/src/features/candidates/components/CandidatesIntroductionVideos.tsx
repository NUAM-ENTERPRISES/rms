import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { ChevronLeft, ChevronRight, Video, Eye, Download, Upload } from "lucide-react";
import { toast } from "sonner";
import {
  useGetCandidateIntroductionVideosQuery,
  useUploadCandidateIntroductionVideoMutation,
  type ListCandidateIntroductionVideosArgs,
} from "@/features/introduction-videos/api";
import { VideoPlayerModal } from "@/components/molecules/VideoPlayerModal";
import {
  ProjectRoleFilter,
  type ProjectRoleFilterValue,
} from "@/components/molecules/ProjectRoleFilter";
import { truncateFileName } from "@/lib/formatFileName";
import { IntroductionVideoUploadModal } from "@/components/molecules/IntroductionVideoUploadModal";

interface CandidatesIntroductionVideosProps {
  candidateId: string;
}

const getStatusBadge = (status?: string) => {
  switch (status) {
    case "verified":
      return (
        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">
          Verified
        </Badge>
      );
    case "rejected":
      return (
        <Badge className="bg-rose-50 text-rose-700 border-rose-200">
          Rejected
        </Badge>
      );
    case "resubmission_required":
      return (
        <Badge className="bg-amber-50 text-amber-700 border-amber-200">
          Resubmission Needed
        </Badge>
      );
    case "pending":
    case "resubmitted":
      return (
        <Badge className="bg-amber-50 text-amber-700 border-amber-200">
          {status === "resubmitted" ? "Resubmitted" : "Pending"}
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="text-slate-400 border-slate-200">
          Not Submitted
        </Badge>
      );
  }
};

function FileNameCell({ fileName }: { fileName: string }) {
  const { display, full, isTruncated } = truncateFileName(fileName, 80);

  if (!isTruncated) {
    return <span className="text-sm text-muted-foreground">{display}</span>;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="text-sm text-muted-foreground truncate max-w-[220px] block cursor-help">
            {display}
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-md break-all">
          <p className="text-xs">{full}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function RemarksCell({ remarks }: { remarks?: string | null }) {
  if (!remarks?.trim()) {
    return <span className="text-sm text-muted-foreground italic">—</span>;
  }

  const { display, full, isTruncated } = truncateFileName(remarks, 80);

  if (!isTruncated) {
    return <span className="text-sm text-muted-foreground">{display}</span>;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="text-sm text-muted-foreground truncate max-w-[220px] block cursor-help">
            {display}
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-md break-all">
          <p className="text-xs">{full}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function CandidatesIntroductionVideos({
  candidateId,
}: CandidatesIntroductionVideosProps) {
  const [page, setPage] = React.useState(1);
  const [libraryPage, setLibraryPage] = React.useState(1);
  const [showUploadDialog, setShowUploadDialog] = React.useState(false);
  const [uploadProgress, setUploadProgress] = React.useState(0);
  const [projectRoleFilter, setProjectRoleFilter] =
    React.useState<ProjectRoleFilterValue>({
      projectId: "all",
      roleCatalogId: "all",
    });

  const queryArgs: ListCandidateIntroductionVideosArgs = {
    candidateId,
    page,
    limit: 10,
    libraryPage,
    libraryLimit: 10,
    projectId: projectRoleFilter.projectId,
    roleCatalogId: projectRoleFilter.roleCatalogId,
  };

  const { data, isLoading, isFetching } = useGetCandidateIntroductionVideosQuery(
    queryArgs,
    { skip: !candidateId }
  );
  const [uploadCandidateIntroductionVideo, { isLoading: isUploading }] =
    useUploadCandidateIntroductionVideoMutation();

  const items = data?.data ?? [];
  const library = data?.library ?? [];
  const pagination = data?.pagination;
  const libraryPagination = data?.libraryPagination;
  const [preview, setPreview] = React.useState<{
    fileUrl: string;
    fileName: string;
    projectTitle: string;
  } | null>(null);

  const handleFilterChange = (value: ProjectRoleFilterValue) => {
    setProjectRoleFilter(value);
    setPage(1);
  };

  const handleUpload = async ({
    file,
    remarks,
  }: {
    file: File;
    remarks?: string;
  }) => {
    try {
      setUploadProgress(0);
      await uploadCandidateIntroductionVideo({
        candidateId,
        file,
        remarks,
        onProgress: setUploadProgress,
      }).unwrap();
      toast.success("Introduction video uploaded successfully");
      setShowUploadDialog(false);
      setUploadProgress(0);
    } catch (error: any) {
      setUploadProgress(0);
      toast.error(error?.data?.message || "Failed to upload introduction video");
    }
  };

  const formatUploadedDate = (value: string) =>
    new Date(value).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  return (
    <>
      <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
        <CardHeader className="border-b border-slate-200 space-y-4">
          <div className="flex w-full flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-slate-900">
                <Video className="h-5 w-5 text-violet-600" />
                Introduction Videos
              </CardTitle>
              <CardDescription className="text-slate-600">
                Upload videos to the candidate library and link them to projects when needed
              </CardDescription>
            </div>
            <Button
              variant="default"
              size="sm"
              className="shrink-0"
              onClick={() => setShowUploadDialog(true)}
            >
              <Upload className="mr-2 h-4 w-4" />
              Upload Video
            </Button>
          </div>
          <ProjectRoleFilter
            value={projectRoleFilter}
            onChange={handleFilterChange}
            className="w-full sm:w-auto"
          />
        </CardHeader>
        <CardContent className="pt-6 space-y-8">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                Loading introduction videos...
              </p>
            </div>
          ) : (
            <>
              {library.length > 0 ? (
                <div className="space-y-3">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-800">
                      Candidate Video Library
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Videos not linked to a project yet. Reuse them when assigning to projects.
                    </p>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>File Name</TableHead>
                        <TableHead>Remarks</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Uploaded At</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {library.map((item) => (
                        <TableRow key={item.documentId}>
                          <TableCell>
                            <FileNameCell fileName={item.fileName} />
                          </TableCell>
                          <TableCell>
                            <RemarksCell remarks={item.remarks} />
                          </TableCell>
                          <TableCell>{getStatusBadge(item.status)}</TableCell>
                          <TableCell>{formatUploadedDate(item.uploadedAt)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                title="View video"
                                onClick={() =>
                                  setPreview({
                                    fileUrl: item.fileUrl,
                                    fileName: item.fileName,
                                    projectTitle: "Candidate library",
                                  })
                                }
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Download video"
                                onClick={() => window.open(item.fileUrl, "_blank")}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {libraryPagination && libraryPagination.totalPages > 1 ? (
                    <div className="flex items-center justify-between pt-2">
                      <p className="text-sm text-muted-foreground">
                        Library page {libraryPagination.page} of{" "}
                        {libraryPagination.totalPages} ({libraryPagination.total}{" "}
                        total)
                      </p>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={libraryPage <= 1 || isFetching}
                          onClick={() =>
                            setLibraryPage((current) => Math.max(1, current - 1))
                          }
                        >
                          <ChevronLeft className="h-4 w-4 mr-1" />
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={
                            libraryPage >= libraryPagination.totalPages ||
                            isFetching
                          }
                          onClick={() =>
                            setLibraryPage((current) =>
                              libraryPagination.totalPages
                                ? Math.min(libraryPagination.totalPages, current + 1)
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
                </div>
              ) : null}

              {items.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No project introduction videos yet.</p>
                  <p className="text-sm mt-2">
                    Upload a video to the candidate library, then link it from a project when required.
                  </p>
                </div>
              ) : (
                <>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-800 mb-3">
                      By Project
                    </h3>
                  </div>
                  <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Project</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Required</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>File Name</TableHead>
                    <TableHead>Remarks</TableHead>
                    <TableHead>Uploaded At</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.candidateProjectMapId}>
                      <TableCell className="font-medium">
                        {item.projectTitle}
                      </TableCell>
                      <TableCell>
                        {item.roleLabel ? (
                          <span className="text-sm text-muted-foreground">
                            {item.roleLabel}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground italic">
                            N/A
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {item.introductionVideoRequired ? (
                          <Badge className="bg-violet-50 text-violet-700 border-violet-200">
                            Required
                          </Badge>
                        ) : (
                          <Badge variant="outline">Optional</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {getStatusBadge(item.video?.status)}
                          {item.video?.rejectionReason &&
                            (item.video.status === "resubmission_required" ||
                              item.video.status === "rejected") && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <p className="text-xs text-red-600 font-medium italic truncate max-w-[180px] cursor-help">
                                      Reason: {item.video.rejectionReason}
                                    </p>
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-xs">
                                    <p className="text-xs">
                                      Reason: {item.video.rejectionReason}
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {item.video?.fileName ? (
                          <FileNameCell fileName={item.video.fileName} />
                        ) : (
                          <span className="text-muted-foreground italic text-sm">
                            No file
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <RemarksCell remarks={item.video?.remarks} />
                      </TableCell>
                      <TableCell>
                        {item.video?.uploadedAt
                          ? formatUploadedDate(item.video.uploadedAt)
                          : "N/A"}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.video ? (
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              title="View video"
                              onClick={() =>
                                setPreview({
                                  fileUrl: item.video!.fileUrl,
                                  fileName: item.video!.fileName,
                                  projectTitle: item.projectTitle,
                                })
                              }
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Download video"
                              onClick={() =>
                                window.open(item.video!.fileUrl, "_blank")
                              }
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {pagination && pagination.totalPages > 1 ? (
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
                  <p className="text-sm text-muted-foreground">
                    Page {pagination.page} of {pagination.totalPages} (
                    {pagination.total} total)
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1 || isFetching}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={
                        page >= pagination.totalPages || isFetching
                      }
                      onClick={() =>
                        setPage((p) =>
                          pagination.totalPages
                            ? Math.min(pagination.totalPages, p + 1)
                            : p + 1
                        )
                      }
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              ) : null}
                </>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <IntroductionVideoUploadModal
        isOpen={showUploadDialog}
        onClose={() => {
          setShowUploadDialog(false);
          setUploadProgress(0);
        }}
        onSubmit={handleUpload}
        isSubmitting={isUploading}
        uploadProgress={uploadProgress}
        idPrefix="candidate-intro-video"
        description="Upload to the candidate library without linking to a project. You can reuse it later when assigning projects."
      />

      {preview && (
        <VideoPlayerModal
          isOpen={!!preview}
          onClose={() => setPreview(null)}
          fileUrl={preview.fileUrl}
          fileName={preview.fileName}
          title="Introduction Video"
          subtitle={preview.projectTitle}
        />
      )}
    </>
  );
}

export default CandidatesIntroductionVideos;
