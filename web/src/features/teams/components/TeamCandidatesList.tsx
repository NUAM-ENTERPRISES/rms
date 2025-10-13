import { useState } from "react";
import {
  Phone,
  Mail,
  Briefcase,
  Users,
  Clock,
  Calendar,
  MoreHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TeamCandidate } from "../api";

interface TeamCandidatesListProps {
  candidates: TeamCandidate[];
}

export default function TeamCandidatesList({
  candidates,
}: TeamCandidatesListProps) {
  const [statusFilter, setStatusFilter] = useState("all");

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // Get candidate status badge variant
  const getCandidateStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "interview_scheduled":
        return "default";
      case "shortlisted":
        return "secondary";
      case "documentation_pending":
        return "outline";
      case "placed":
        return "secondary";
      default:
        return "outline";
    }
  };

  const filteredCandidates = Array.isArray(candidates)
    ? candidates.filter((candidate) => {
        if (statusFilter === "all") return true;
        return candidate.currentStatus === statusFilter;
      })
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-800">
          Candidate Pipeline (
          {Array.isArray(candidates) ? candidates.length : 0})
        </h3>
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="shortlisted">Shortlisted</SelectItem>
              <SelectItem value="interview_scheduled">
                Interview Scheduled
              </SelectItem>
              <SelectItem value="placed">Placed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {filteredCandidates.length > 0 ? (
        <div className="space-y-4">
          {filteredCandidates.map((candidate) => (
            <Card
              key={candidate.id}
              className="border border-slate-200 hover:shadow-md transition-shadow"
            >
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="text-lg font-semibold text-slate-800">
                        {candidate.name}
                      </h4>
                      <Badge
                        variant={getCandidateStatusBadgeVariant(
                          candidate.currentStatus
                        )}
                      >
                        {candidate.currentStatus.replace("_", " ")}
                      </Badge>
                      <Badge variant="outline">
                        {candidate.experience} years exp
                      </Badge>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Phone className="h-4 w-4" />
                          <span>{candidate.contact}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Mail className="h-4 w-4" />
                          <span>{candidate.email}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Briefcase className="h-4 w-4" />
                          <span>{candidate.assignedProject.title}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Users className="h-4 w-4" />
                          <span>
                            Assigned by {candidate.assignedBy.name} (
                            {candidate.assignedBy.role})
                          </span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="text-sm">
                          <span className="text-slate-600">Skills: </span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {candidate.skills
                              .slice(0, 3)
                              .map((skill, index) => (
                                <Badge
                                  key={index}
                                  variant="outline"
                                  className="text-xs"
                                >
                                  {skill}
                                </Badge>
                              ))}
                            {candidate.skills.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{candidate.skills.length - 3} more
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Clock className="h-4 w-4" />
                          <span>
                            Last activity: {formatDate(candidate.lastActivity)}
                          </span>
                        </div>
                        {candidate.nextInterview && (
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <Calendar className="h-4 w-4" />
                            <span>
                              Next interview:{" "}
                              {formatDate(candidate.nextInterview)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="text-slate-400 mb-4">
            <Users className="h-12 w-12 mx-auto" />
          </div>
          <h3 className="text-lg font-semibold text-slate-800 mb-2">
            No candidates found
          </h3>
          <p className="text-slate-600">
            {statusFilter === "all"
              ? "This team doesn't have any candidates assigned yet."
              : `No candidates found with status "${statusFilter}".`}
          </p>
        </div>
      )}
    </div>
  );
}
