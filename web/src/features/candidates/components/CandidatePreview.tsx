import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  User,
  Phone,
  Mail,
  Calendar,
  Briefcase,
  GraduationCap,
  MapPin,
  CheckCircle,
  X,
} from "lucide-react";

interface CandidatePreviewProps {
  candidateData: {
    firstName: string;
    lastName: string;
    contact: string;
    email?: string;
    source: string;
    dateOfBirth: string;
    highestEducation?: string;
    university?: string;
    graduationYear?: number;
    gpa?: number;
    qualifications?: any[];
    workExperiences?: any[];
  };
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export default function CandidatePreview({
  candidateData,
  onConfirm,
  onCancel,
  isLoading = false,
}: CandidatePreviewProps) {
  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <Dialog open={true} onOpenChange={onCancel}>
      <DialogContent className="!w-5xl !h-[95vh] sm:!max-w-[98vw]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <CheckCircle className="h-6 w-6 text-green-600" />
            Candidate Preview
          </DialogTitle>
          <DialogDescription>
            Review all the details before creating the candidate
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 overflow-y-auto max-h-[calc(95vh-120px)]">
          {/* Personal Information */}
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg font-semibold text-slate-800">
                <User className="h-4 w-4 text-blue-600" />
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-600">
                    Full Name
                  </label>
                  <p className="text-sm font-semibold text-slate-800">
                    {candidateData.firstName} {candidateData.lastName}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600">
                    Contact
                  </label>
                  <p className="text-sm font-semibold text-slate-800 flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {candidateData.contact}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600">
                    Email
                  </label>
                  <p className="text-sm font-semibold text-slate-800 flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    {candidateData.email || "Not provided"}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600">
                    Date of Birth
                  </label>
                  <p className="text-sm font-semibold text-slate-800 flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatDate(candidateData.dateOfBirth)}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600">
                    Source
                  </label>
                  <Badge variant="outline" className="mt-1 text-xs">
                    {candidateData.source}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Educational Qualifications */}
          {((candidateData.qualifications &&
            candidateData.qualifications.length > 0) ||
            candidateData.highestEducation ||
            candidateData.university ||
            candidateData.graduationYear ||
            candidateData.gpa) && (
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg font-semibold text-slate-800">
                  <GraduationCap className="h-4 w-4 text-blue-600" />
                  Educational Qualifications
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* New Multiple Qualifications */}
                {candidateData.qualifications &&
                  candidateData.qualifications.length > 0 && (
                    <div className="space-y-3">
                      {candidateData.qualifications.map(
                        (qualification, index) => (
                          <div
                            key={qualification.id || index}
                            className="border border-slate-200 rounded-lg p-3 bg-slate-50"
                          >
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div>
                                <label className="text-xs font-medium text-slate-600">
                                  Qualification
                                </label>
                                <p className="text-sm font-semibold text-slate-800">
                                  {qualification.qualificationName ||
                                    `Qualification ${qualification.qualificationId}`}
                                </p>
                              </div>
                              {qualification.university && (
                                <div>
                                  <label className="text-xs font-medium text-slate-600">
                                    University
                                  </label>
                                  <p className="text-sm font-semibold text-slate-800">
                                    {qualification.university}
                                  </p>
                                </div>
                              )}
                              {qualification.graduationYear && (
                                <div>
                                  <label className="text-xs font-medium text-slate-600">
                                    Graduation Year
                                  </label>
                                  <p className="text-sm font-semibold text-slate-800">
                                    {qualification.graduationYear}
                                  </p>
                                </div>
                              )}
                              {qualification.gpa && (
                                <div>
                                  <label className="text-xs font-medium text-slate-600">
                                    GPA
                                  </label>
                                  <p className="text-sm font-semibold text-slate-800">
                                    {qualification.gpa}
                                  </p>
                                </div>
                              )}
                            </div>
                            {qualification.notes && (
                              <div className="mt-2">
                                <label className="text-xs font-medium text-slate-600">
                                  Notes
                                </label>
                                <p className="text-xs text-slate-800">
                                  {qualification.notes}
                                </p>
                              </div>
                            )}
                          </div>
                        )
                      )}
                    </div>
                  )}

                {/* Legacy Single Qualification Fields */}
                {(candidateData.highestEducation ||
                  candidateData.university ||
                  candidateData.graduationYear ||
                  candidateData.gpa) && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {candidateData.highestEducation && (
                      <div>
                        <label className="text-xs font-medium text-slate-600">
                          Highest Education
                        </label>
                        <p className="text-sm font-semibold text-slate-800">
                          {candidateData.highestEducation}
                        </p>
                      </div>
                    )}
                    {candidateData.university && (
                      <div>
                        <label className="text-xs font-medium text-slate-600">
                          University
                        </label>
                        <p className="text-sm font-semibold text-slate-800">
                          {candidateData.university}
                        </p>
                      </div>
                    )}
                    {candidateData.graduationYear && (
                      <div>
                        <label className="text-xs font-medium text-slate-600">
                          Graduation Year
                        </label>
                        <p className="text-sm font-semibold text-slate-800">
                          {candidateData.graduationYear}
                        </p>
                      </div>
                    )}
                    {candidateData.gpa && (
                      <div>
                        <label className="text-xs font-medium text-slate-600">
                          GPA
                        </label>
                        <p className="text-sm font-semibold text-slate-800">
                          {candidateData.gpa}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
          {/* Work Experience */}
          {candidateData.workExperiences &&
            candidateData.workExperiences.length > 0 && (
              <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg font-semibold text-slate-800">
                    <Briefcase className="h-4 w-4 text-blue-600" />
                    Work Experience ({candidateData.workExperiences.length}{" "}
                    entries)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {candidateData.workExperiences.map((experience, index) => (
                    <div
                      key={experience.id || index}
                      className="border border-slate-200 rounded-lg p-3 bg-slate-50"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold text-slate-900 text-sm">
                            {experience.jobTitle}
                          </h4>
                          <p className="text-slate-600 font-medium text-xs">
                            {experience.companyName}
                          </p>
                          <p className="text-xs text-slate-500 mt-1">
                            {formatDate(experience.startDate)} -{" "}
                            {experience.isCurrent
                              ? "Present"
                              : formatDate(experience.endDate)}
                          </p>
                          {experience.location && (
                            <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                              <MapPin className="h-3 w-3" />
                              {experience.location}
                            </p>
                          )}
                          {experience.description && (
                            <p className="text-xs text-slate-600 mt-2">
                              {experience.description}
                            </p>
                          )}
                          {experience.skills && experience.skills.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {experience.skills.map(
                                (skill: string, skillIndex: number) => (
                                  <Badge
                                    key={skillIndex}
                                    variant="outline"
                                    className="text-xs"
                                  >
                                    {skill}
                                  </Badge>
                                )
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter className="flex items-center justify-center gap-4 pt-6">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
            className="min-w-[120px]"
          >
            <X className="h-4 w-4 mr-2" />
            Back to Edit
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="min-w-[120px] bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white shadow-lg hover:shadow-xl transition-all duration-200"
          >
            {isLoading ? (
              <>
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Creating...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Create Candidate
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
