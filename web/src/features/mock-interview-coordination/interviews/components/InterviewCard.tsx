import {
  Calendar,
  Clock,
  User,
  Building2,
  Briefcase,
  Video,
  Phone,
  MapPin,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { MockInterview } from "../../types";
import { format } from "date-fns";

interface InterviewCardProps {
  interview: MockInterview;
  onView?: (interview: MockInterview) => void;
  onConduct?: (interview: MockInterview) => void;
  showActions?: boolean;
}

const decisionColors: Record<string, string> = {
  approved:
    "bg-green-50 text-green-700 border-green-200 ring-green-500/10 dark:bg-green-500/10 dark:text-green-400",
  needs_training:
    "bg-orange-50 text-orange-700 border-orange-200 ring-orange-500/10 dark:bg-orange-500/10 dark:text-orange-400",
  rejected:
    "bg-red-50 text-red-700 border-red-200 ring-red-500/10 dark:bg-red-500/10 dark:text-red-400",
};

const decisionIcons: Record<string, any> = {
  approved: CheckCircle2,
  needs_training: AlertCircle,
  rejected: XCircle,
};

const modeIcons: Record<string, any> = {
  video: Video,
  phone: Phone,
  in_person: MapPin,
};

export function InterviewCard({
  interview,
  onView,
  onConduct,
  showActions = true,
}: InterviewCardProps) {
  const isScheduled = interview.scheduledTime && !interview.conductedAt;
  const isCompleted = !!interview.conductedAt;
  const isPending = !interview.scheduledTime;

  const ModeIcon = modeIcons[interview.mode] || Video;
  const DecisionIcon = interview.decision
    ? decisionIcons[interview.decision]
    : null;

  return (
    <Card
      className={cn(
        "group relative overflow-hidden transition-all duration-300",
        "hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5",
        "border-border/50 hover:border-primary/30"
      )}
    >
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      <CardHeader className="pb-3 relative">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <User className="h-4 w-4 text-primary" />
              {interview.candidateProjectMap?.candidate
                ? `${interview.candidateProjectMap.candidate.firstName} ${interview.candidateProjectMap.candidate.lastName}`
                : "Unknown Candidate"}
            </CardTitle>
            <CardDescription className="text-xs mt-1 flex items-center gap-1">
              <Building2 className="h-3 w-3" />
              {interview.candidateProjectMap?.project?.title ||
                "Unknown Project"}
            </CardDescription>
            <CardDescription className="text-xs flex items-center gap-1">
              <Briefcase className="h-3 w-3" />
              {interview.candidateProjectMap?.roleNeeded?.designation ||
                "Unknown Role"}
            </CardDescription>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            {isPending && (
              <Badge
                variant="outline"
                className="bg-zinc-50 text-zinc-700 border-zinc-200 shadow-sm"
              >
                <Clock className="h-3 w-3 mr-1" />
                Pending
              </Badge>
            )}
            {isScheduled && (
              <Badge
                variant="outline"
                className="bg-blue-50 text-blue-700 border-blue-200 shadow-sm ring-1 ring-blue-500/10"
              >
                <Calendar className="h-3 w-3 mr-1" />
                Scheduled
              </Badge>
            )}
            {isCompleted && interview.decision && (
              <Badge
                variant="outline"
                className={cn(
                  "shadow-sm font-medium capitalize",
                  decisionColors[interview.decision]
                )}
              >
                {DecisionIcon && <DecisionIcon className="h-3 w-3 mr-1" />}
                {interview.decision.replace("_", " ")}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 relative">
        {/* Interview Details */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          {interview.scheduledTime && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-3 w-3" />
              <span className="text-xs">
                {format(new Date(interview.scheduledTime), "MMM dd, yyyy")}
              </span>
            </div>
          )}
          {interview.scheduledTime && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span className="text-xs">
                {format(new Date(interview.scheduledTime), "hh:mm a")} (
                {interview.duration}min)
              </span>
            </div>
          )}
          <div className="flex items-center gap-2 text-muted-foreground">
            <ModeIcon className="h-3 w-3" />
            <span className="text-xs capitalize">
              {interview.mode.replace("_", " ")}
            </span>
          </div>
          {interview.coordinator && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <User className="h-3 w-3" />
              <span className="text-xs">{interview.coordinator.name}</span>
            </div>
          )}
        </div>

        {/* Completed Interview Summary */}
        {isCompleted && (
          <div className="pt-3 border-t border-border/50 space-y-2">
            {interview.overallRating && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground font-medium">
                  Overall Rating
                </span>
                <div className="flex items-center gap-1">
                  <div className="flex">
                    {Array.from({ length: interview.overallRating }).map(
                      (_, i) => (
                        <span key={i} className="text-yellow-500 text-sm">
                          ★
                        </span>
                      )
                    )}
                    {Array.from({ length: 5 - interview.overallRating }).map(
                      (_, i) => (
                        <span
                          key={i}
                          className="text-muted-foreground/30 text-sm"
                        >
                          ★
                        </span>
                      )
                    )}
                  </div>
                  <span className="font-semibold text-xs ml-1">
                    {interview.overallRating}/5
                  </span>
                </div>
              </div>
            )}
            {interview.conductedAt && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <CheckCircle2 className="h-3 w-3" />
                Conducted{" "}
                {format(new Date(interview.conductedAt), "MMM dd, yyyy")}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        {showActions && (
          <div className="flex gap-2 pt-3 border-t border-border/50">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 group/btn hover:border-primary/50 transition-colors"
              onClick={() => onView?.(interview)}
            >
              <span className="group-hover/btn:text-primary transition-colors">
                View Details
              </span>
            </Button>
            {isScheduled && !isCompleted && (
              <Button
                size="sm"
                className="flex-1 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-sm hover:shadow-md transition-all"
                onClick={() => onConduct?.(interview)}
              >
                Conduct Interview
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
