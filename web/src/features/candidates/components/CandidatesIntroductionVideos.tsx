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
import { Video, Eye, Download } from "lucide-react";
import { useGetCandidateIntroductionVideosQuery } from "@/features/introduction-videos/api";
import { VideoPlayerModal } from "@/components/molecules/VideoPlayerModal";

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

export function CandidatesIntroductionVideos({
  candidateId,
}: CandidatesIntroductionVideosProps) {
  const { data, isLoading } = useGetCandidateIntroductionVideosQuery(candidateId, {
    skip: !candidateId,
  });

  const items = data?.data ?? [];
  const [preview, setPreview] = React.useState<{
    fileUrl: string;
    fileName: string;
    projectTitle: string;
  } | null>(null);

  return (
    <>
      <Card className="mt-6 border-0 shadow-lg bg-white/80 backdrop-blur-sm">
        <CardHeader className="border-b border-slate-200">
          <CardTitle className="flex items-center gap-2 text-slate-900">
            <Video className="h-5 w-5 text-violet-600" />
            Introduction Videos
          </CardTitle>
          <CardDescription className="text-slate-600">
            Candidate introduction videos grouped by project
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Loading introduction videos...</p>
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No introduction videos required or uploaded yet.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project</TableHead>
                  <TableHead>Required</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>File Name</TableHead>
                  <TableHead>Uploaded At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.candidateProjectMapId}>
                    <TableCell className="font-medium">{item.projectTitle}</TableCell>
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
                      {item.video?.fileName ?? (
                        <span className="text-muted-foreground italic text-sm">No file</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {item.video?.uploadedAt
                        ? new Date(item.video.uploadedAt).toLocaleDateString("en-GB", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })
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
                            onClick={() => window.open(item.video!.fileUrl, "_blank")}
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
          )}
        </CardContent>
      </Card>

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
