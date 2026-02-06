import React from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { FileText, UserCheck, Award, Clock3 } from "lucide-react";
import { Candidate } from "../../api";

interface CandidateMetricsProps {
  candidate: Candidate;
}

export const CandidateMetrics: React.FC<CandidateMetricsProps> = ({ candidate }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Applications</CardTitle>
          <FileText className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{candidate.metrics?.totalApplications ?? 0}</div>
          <p className="text-xs text-muted-foreground">Across all projects</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Interviews Scheduled</CardTitle>
          <UserCheck className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{candidate.metrics?.interviewsScheduled ?? 0}</div>
          <p className="text-xs text-muted-foreground">
            {candidate.metrics?.interviewsCompleted ?? 0} completed
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Offers Received</CardTitle>
          <Award className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{candidate.metrics?.offersReceived ?? 0}</div>
          <p className="text-xs text-muted-foreground">{candidate.metrics?.placements ?? 0} accepted</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
          <Clock3 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{candidate.metrics?.averageResponseTime ?? 0} days</div>
          <p className="text-xs text-muted-foreground">From application to response</p>
        </CardContent>
      </Card>
    </div>
  );
};
