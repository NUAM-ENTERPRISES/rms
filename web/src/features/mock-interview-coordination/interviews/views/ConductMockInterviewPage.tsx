import { useParams } from "react-router-dom";
import { useGetMockInterviewQuery } from "../data/interviews.endpoints";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Calendar, Clock, MapPin, User } from "lucide-react";
import type { MockInterview } from "../../types";

export default function ConductMockInterviewPage() {
  const { interviewId } = useParams<{ interviewId: string }>();
  
  const { data, isLoading, error } = useGetMockInterviewQuery(interviewId || "", {
    skip: !interviewId,
  });

  // Safely extract interview data
  const interview = (data?.data || (data as any)) as MockInterview | undefined;

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Loading interview details...</p>
        </div>
      </div>
    );
  }

  if (error || !interview?.id) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl space-y-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error ? "Failed to load interview details" : "Interview not found"}
          </AlertDescription>
        </Alert>
        <div className="text-sm text-muted-foreground bg-muted p-4 rounded">
          <p className="font-mono">Interview ID: {interviewId}</p>
          <p className="text-xs mt-2">If you're seeing this error, please check that the interview ID is correct and the interview exists in the system.</p>
        </div>
      </div>
    );
  }

  const candidate = interview.candidateProjectMap?.candidate;
  const project = interview.candidateProjectMap?.project;
  const roleNeeded = interview.candidateProjectMap?.roleNeeded;
  const coordinator = interview.coordinator;

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Conduct Mock Interview</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Interview for {candidate?.firstName} {candidate?.lastName}
        </p>
      </div>

      {/* Candidate Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Candidate Information</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-sm text-muted-foreground">Candidate Name</p>
            <p className="text-base font-medium">
              {candidate?.firstName} {candidate?.lastName}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Email</p>
            <p className="text-base font-medium">{candidate?.email || "N/A"}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Phone</p>
            <p className="text-base font-medium">{candidate?.phone || "N/A"}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Position Applied</p>
            <p className="text-base font-medium">{roleNeeded?.designation}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Project</p>
            <p className="text-base font-medium">{project?.title}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Coordinator</p>
            <p className="text-base font-medium">
              {coordinator?.name || "Unassigned"}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Interview Details */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between w-full">
            <CardTitle className="text-lg">Interview Details</CardTitle>
            <div className="flex items-center gap-3">
              <Badge className="text-sm">
                {interview.status || "Status N/A"}
              </Badge>

              {interview.overallRating && (
                <div className="text-xs text-muted-foreground text-right">
                  <div className="text-sm font-medium">{interview.overallRating}/5</div>
                  <div className="text-xs">Rating</div>
                </div>
              )}

              {interview.overallScore && (
                <div className="text-xs text-muted-foreground text-right">
                  <div className="text-sm font-medium">{interview.overallScore}%</div>
                  <div className="text-xs">Score</div>
                </div>
              )}

              {interview.decision && (
                <Badge
                  variant={
                    interview.decision === "SELECTED" ? "default" : "destructive"
                  }
                  className="text-xs"
                >
                  {interview.decision}
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Scheduled Time */}
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">Scheduled Time</p>
                <p className="text-base font-medium">
                  {interview.scheduledTime
                    ? new Date(interview.scheduledTime).toLocaleString()
                    : "Not scheduled"}
                </p>
              </div>
            </div>

            {/* Duration */}
            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">Duration</p>
                <p className="text-base font-medium">
                  {interview.duration ? `${interview.duration} minutes` : "N/A"}
                </p>
              </div>
            </div>

            {/* Mode */}
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">Mode</p>
                <p className="text-base font-medium">
                  <Badge variant="outline">{interview.mode || "N/A"}</Badge>
                </p>
              </div>
            </div>

            {/* Meeting Link (always show — displays fallback when missing) */}
            <div className="flex items-start gap-3">
              <User className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">Meeting Link</p>
                {interview.meetingLink ? (
                  <a
                    href={interview.meetingLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-base font-medium text-blue-600 hover:underline"
                  >
                    Join Meeting
                  </a>
                ) : (
                  <p className="text-base font-medium text-muted-foreground">No link</p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Interview Status moved into Interview Details header above */}

      {/* Feedback Section */}
      {interview.conductedAt && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Feedback & Remarks</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {interview.remarks && (
              <div>
                <p className="text-sm text-muted-foreground">Remarks</p>
                <p className="text-base mt-1 whitespace-pre-wrap">
                  {interview.remarks}
                </p>
              </div>
            )}
            {interview.strengths && (
              <div>
                <p className="text-sm text-muted-foreground">Strengths</p>
                <p className="text-base mt-1 whitespace-pre-wrap">
                  {interview.strengths}
                </p>
              </div>
            )}
            {interview.areasOfImprovement && (
              <div>
                <p className="text-sm text-muted-foreground">
                  Areas of Improvement
                </p>
                <p className="text-base mt-1 whitespace-pre-wrap">
                  {interview.areasOfImprovement}
                </p>
              </div>
            )}
            {interview.notes && (
              <div>
                <p className="text-sm text-muted-foreground">Notes</p>
                <p className="text-base mt-1 whitespace-pre-wrap">
                  {interview.notes}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
