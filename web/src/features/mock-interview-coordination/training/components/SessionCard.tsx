import { useState } from "react";
import { format } from "date-fns";
import {
  Calendar,
  CheckCircle2,
  Clock,
  Video,
  Users,
  MapPin,
  FileText,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrainingSession } from "../../types";
import { CompleteSessionDialog } from "./CompleteSessionDialog";
import { cn } from "@/lib/utils";

interface SessionCardProps {
  session: TrainingSession;
  sessionNumber: number;
  canComplete: boolean;
}

export function SessionCard({
  session,
  sessionNumber,
  canComplete,
}: SessionCardProps) {
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);

  const isCompleted = !!session.completedAt;
  const isPast = new Date(session.sessionDate) < new Date();

  const getSessionTypeIcon = (type: string) => {
    switch (type) {
      case "video":
        return Video;
      case "in_person":
        return Users;
      case "phone":
        return MapPin;
      default:
        return FileText;
    }
  };

  const SessionTypeIcon = getSessionTypeIcon(session.sessionType);

  return (
    <>
      <Card
        className={cn(
          "border-l-4 transition-all hover:shadow-sm",
          isCompleted
            ? "border-l-green-500 bg-green-50/50 dark:bg-green-950/20"
            : isPast
            ? "border-l-orange-500 bg-orange-50/50 dark:bg-orange-950/20"
            : "border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/20"
        )}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 flex-1">
              <div
                className={cn(
                  "p-2 rounded-lg shrink-0",
                  isCompleted
                    ? "bg-green-100 dark:bg-green-900/30"
                    : isPast
                    ? "bg-orange-100 dark:bg-orange-900/30"
                    : "bg-blue-100 dark:bg-blue-900/30"
                )}
              >
                <SessionTypeIcon
                  className={cn(
                    "h-4 w-4",
                    isCompleted
                      ? "text-green-600 dark:text-green-400"
                      : isPast
                      ? "text-orange-600 dark:text-orange-400"
                      : "text-blue-600 dark:text-blue-400"
                  )}
                />
              </div>

              <div className="flex-1 space-y-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold">Session {sessionNumber}</h4>
                    {isCompleted ? (
                      <Badge className="text-xs bg-green-100 text-green-700 hover:bg-green-100 dark:bg-green-900/50 dark:text-green-300">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Completed
                      </Badge>
                    ) : isPast ? (
                      <Badge className="text-xs bg-orange-100 text-orange-700 hover:bg-orange-100 dark:bg-orange-900/50 dark:text-orange-300">
                        <Clock className="h-3 w-3 mr-1" />
                        Pending
                      </Badge>
                    ) : (
                      <Badge className="text-xs">
                        <Calendar className="h-3 w-3 mr-1" />
                        Scheduled
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground capitalize">
                    {session.sessionType.replace("_", " ")}
                  </p>
                </div>

                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>
                      {format(new Date(session.sessionDate), "MMM d, yyyy")}
                    </span>
                  </div>
                  {session.duration && (
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      <span>{session.duration} mins</span>
                    </div>
                  )}
                </div>

                {session.topicsCovered && session.topicsCovered.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1.5">
                      Topics Covered
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {session.topicsCovered.map((topic, index) => (
                        <Badge
                          key={index}
                          variant="secondary"
                          className="text-xs font-normal"
                        >
                          {topic}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {isCompleted && session.performanceRating && (
                  <div className="pt-3 border-t space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Performance
                      </span>
                      <Badge
                        variant={
                          session.performanceRating === "excellent"
                            ? "default"
                            : session.performanceRating === "good"
                            ? "default"
                            : "secondary"
                        }
                        className="capitalize"
                      >
                        {session.performanceRating.replace("_", " ")}
                      </Badge>
                    </div>
                    {session.notes && (
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {session.notes}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {canComplete && !isCompleted && isPast && (
              <Button
                size="sm"
                onClick={() => setCompleteDialogOpen(true)}
                className="shrink-0"
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Complete
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <CompleteSessionDialog
        open={completeDialogOpen}
        onOpenChange={setCompleteDialogOpen}
        session={session}
      />
    </>
  );
}
