import React from "react";
import { toast } from "sonner";
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
import {
  Video,
  Upload,
  Link2,
  Eye,
  Download,
  RefreshCw,
} from "lucide-react";
import { VideoPlayerModal } from "@/components/molecules/VideoPlayerModal";
import { IntroductionVideoUploadModal } from "@/components/molecules/IntroductionVideoUploadModal";
import { IntroductionVideoReuseModal } from "@/components/molecules/IntroductionVideoReuseModal";
import { truncateFileName } from "@/lib/formatFileName";
import {
  useUploadIntroductionVideoMutation,
  useReuseIntroductionVideoMutation,
  useReuploadIntroductionVideoMutation,
  type IntroductionVideoVerification,
} from "@/features/introduction-videos/api";

interface ProjectIntroductionVideoSectionProps {
  candidateId: string;
  projectId: string;
  projectTitle?: string;
  introductionVideo?: IntroductionVideoVerification | null;
  isVerificationSent?: boolean;
  onSuccess?: () => void;
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

export function ProjectIntroductionVideoSection({
  candidateId,
  projectId,
  projectTitle,
  introductionVideo,
  isVerificationSent = false,
  onSuccess,
}: ProjectIntroductionVideoSectionProps) {
  const [uploadIntroductionVideo, { isLoading: isUploading }] =
    useUploadIntroductionVideoMutation();
  const [reuseIntroductionVideo, { isLoading: isReusing }] =
    useReuseIntroductionVideoMutation();
  const [reuploadIntroductionVideo, { isLoading: isReuploading }] =
    useReuploadIntroductionVideoMutation();

  const [showUploadDialog, setShowUploadDialog] = React.useState(false);
  const [showReuseDialog, setShowReuseDialog] = React.useState(false);
  const [showVideoModal, setShowVideoModal] = React.useState(false);
  const [isReuploadMode, setIsReuploadMode] = React.useState(false);
  const [uploadProgress, setUploadProgress] = React.useState(0);

  const canEdit =
    !introductionVideo ||
    !isVerificationSent ||
    introductionVideo.status === "resubmission_required";

  const canReupload =
    canEdit &&
    introductionVideo?.status === "resubmission_required";

  const isRejectedWaitingForResubmitRequest =
    isVerificationSent &&
    introductionVideo?.status === "rejected";

  const handleUpload = async ({
    file,
    remarks,
  }: {
    file: File;
    remarks?: string;
  }) => {
    try {
      setUploadProgress(0);
      if (isReuploadMode && introductionVideo) {
        await reuploadIntroductionVideo({
          candidateId,
          projectId,
          file,
          remarks,
          onProgress: setUploadProgress,
        }).unwrap();
        toast.success("Introduction video re-uploaded successfully");
      } else {
        await uploadIntroductionVideo({
          candidateId,
          projectId,
          file,
          remarks,
          onProgress: setUploadProgress,
        }).unwrap();
        toast.success("Introduction video uploaded successfully");
      }
      setShowUploadDialog(false);
      setIsReuploadMode(false);
      setUploadProgress(0);
      onSuccess?.();
    } catch (error: any) {
      setUploadProgress(0);
      toast.error(error?.data?.message || "Failed to upload introduction video");
    }
  };

  const handleReuse = async (documentId: string) => {
    try {
      await reuseIntroductionVideo({
        candidateId,
        projectId,
        documentId,
      }).unwrap();
      toast.success("Introduction video linked successfully");
      setShowReuseDialog(false);
      onSuccess?.();
    } catch (error: any) {
      toast.error(error?.data?.message || "Failed to link introduction video");
    }
  };

  const videoDoc = introductionVideo?.document;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="h-5 w-5 text-violet-600" />
            Project Introduction Video
          </CardTitle>
          <CardDescription>
            Upload or reuse a candidate introduction video required for this project.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Document</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>File Name</TableHead>
                <TableHead>Remarks</TableHead>
                <TableHead>Uploaded At</TableHead>
                <TableHead className="text-right w-[140px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">
                  Introduction Video
                  <Badge
                    variant="destructive"
                    className="ml-2 h-5 px-1.5 text-[9px] uppercase font-bold tracking-tighter"
                  >
                    Required
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    {getStatusBadge(introductionVideo?.status)}
                    {introductionVideo?.status === "resubmission_required" &&
                      introductionVideo.rejectionReason && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <p className="text-xs text-red-600 font-medium italic mt-1 truncate max-w-[200px] cursor-help">
                                Reason: {introductionVideo.rejectionReason}
                              </p>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p className="text-xs">
                                Reason: {introductionVideo.rejectionReason}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    {isRejectedWaitingForResubmitRequest && (
                      <p className="text-xs text-muted-foreground italic mt-1 max-w-[220px]">
                        Waiting for documentation resubmission request
                      </p>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {videoDoc ? (
                    (() => {
                      const { display, full, isTruncated } = truncateFileName(
                        videoDoc.fileName,
                        80
                      );
                      if (!isTruncated) {
                        return (
                          <span className="text-xs text-muted-foreground truncate max-w-[180px] block">
                            {display}
                          </span>
                        );
                      }
                      return (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="text-xs text-muted-foreground truncate max-w-[180px] block cursor-help">
                                {display}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-md break-all">
                              <p className="text-xs">{full}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      );
                    })()
                  ) : (
                    <span className="text-xs text-muted-foreground italic">No file</span>
                  )}
                </TableCell>
                <TableCell>
                  {videoDoc?.remarks ? (
                    (() => {
                      const { display, full, isTruncated } = truncateFileName(
                        videoDoc.remarks,
                        80
                      );
                      if (!isTruncated) {
                        return (
                          <span className="text-xs text-muted-foreground">
                            {display}
                          </span>
                        );
                      }
                      return (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="text-xs text-muted-foreground truncate max-w-[180px] block cursor-help">
                                {display}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-md break-all">
                              <p className="text-xs">{full}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      );
                    })()
                  ) : (
                    <span className="text-xs text-muted-foreground italic">—</span>
                  )}
                </TableCell>
                <TableCell>
                  {videoDoc?.createdAt
                    ? new Date(videoDoc.createdAt).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "N/A"}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    {videoDoc ? (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="View video"
                          onClick={() => setShowVideoModal(true)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Download video"
                          onClick={() => window.open(videoDoc.fileUrl, "_blank")}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        {canEdit && (
                          <Button
                            variant="ghost"
                            size="icon"
                            title={
                              canReupload
                                ? "Re-upload (Requested)"
                                : "Re-upload video"
                            }
                            className={
                              canReupload
                                ? "text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                : "text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                            }
                            onClick={() => {
                              setIsReuploadMode(true);
                              setShowUploadDialog(true);
                            }}
                          >
                            {canReupload ? (
                              <Upload className="h-4 w-4" />
                            ) : (
                              <RefreshCw className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                      </>
                    ) : canEdit ? (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-violet-600 hover:bg-violet-50"
                          onClick={() => setShowReuseDialog(true)}
                        >
                          <Link2 className="h-4 w-4 mr-2" />
                          Add Existing
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-primary hover:bg-primary/10"
                          onClick={() => {
                            setIsReuploadMode(false);
                            setShowUploadDialog(true);
                          }}
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Upload
                        </Button>
                      </div>
                    ) : null}
                  </div>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <IntroductionVideoUploadModal
        isOpen={showUploadDialog}
        onClose={() => {
          setShowUploadDialog(false);
          setIsReuploadMode(false);
          setUploadProgress(0);
        }}
        onSubmit={handleUpload}
        isSubmitting={isUploading || isReuploading}
        uploadProgress={uploadProgress}
        variant={isReuploadMode ? "reupload" : "upload"}
        idPrefix="project-intro-video"
      />

      <IntroductionVideoReuseModal
        isOpen={showReuseDialog}
        onClose={() => setShowReuseDialog(false)}
        candidateId={candidateId}
        excludeProjectId={projectId}
        onReuse={handleReuse}
        isReusing={isReusing}
      />

      {videoDoc && (
        <VideoPlayerModal
          isOpen={showVideoModal}
          onClose={() => setShowVideoModal(false)}
          fileUrl={videoDoc.fileUrl}
          fileName={videoDoc.fileName}
          title="Introduction Video"
          subtitle={projectTitle}
        />
      )}
    </>
  );
}

export default ProjectIntroductionVideoSection;
