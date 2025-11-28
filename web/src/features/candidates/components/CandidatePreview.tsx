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
    <DialogContent className="!w-5xl !h-[95vh] sm:!max-w-[98vw] bg-white rounded-lg shadow-xl border border-slate-200 overflow-hidden">
      <DialogHeader className="px-6 pt-6">
        <DialogTitle className="text-2xl font-semibold text-slate-900 flex items-center gap-3 select-none">
          <CheckCircle className="h-6 w-6 text-green-600" />
          Candidate Preview
        </DialogTitle>
        <DialogDescription className="mt-1 text-sm text-slate-600 font-medium">
          Review all the details before creating the candidate
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-8 overflow-y-auto max-h-[calc(95vh-130px)] px-6 pb-6 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent">
        {/* Personal Information */}
        <Card className="border border-slate-300 rounded-md shadow-sm bg-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg font-semibold text-slate-800 px-4 py-3 border-b border-slate-200">
              <User className="h-5 w-5 text-blue-600" />
              Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase">
                  Full Name
                </label>
                <p className="mt-1 text-sm font-medium text-slate-900">
                  {candidateData.firstName} {candidateData.lastName}
                </p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase">
                  Contact
                </label>
                <p className="mt-1 text-sm font-medium text-slate-900 flex items-center gap-2">
                  <Phone className="h-4 w-4 text-blue-600" />
                  {candidateData.contact}
                </p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase">
                  Email
                </label>
                <p className="mt-1 text-sm font-medium text-slate-900 flex items-center gap-2">
                  <Mail className="h-4 w-4 text-blue-600" />
                  {candidateData.email || "Not provided"}
                </p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase">
                  Date of Birth
                </label>
                <p className="mt-1 text-sm font-medium text-slate-900 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-blue-600" />
                  {formatDate(candidateData.dateOfBirth)}
                </p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase">
                  Source
                </label>
                <Badge variant="outline" className="mt-1 text-xs text-blue-600 border-blue-600">
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
          <Card className="border border-slate-300 rounded-md shadow-sm bg-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg font-semibold text-slate-800 px-4 py-3 border-b border-slate-200">
                <GraduationCap className="h-5 w-5 text-blue-600" />
                Educational Qualifications
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-4">
              {candidateData.qualifications &&
                candidateData.qualifications.length > 0 && (
                  <div className="space-y-4">
                    {candidateData.qualifications.map(
                      (qualification, index) => (
                        <div
                          key={qualification.id || index}
                          className="border border-slate-200 rounded-md p-4 bg-slate-50"
                        >
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                              <label className="block text-xs font-semibold text-slate-600 uppercase">
                                Qualification
                              </label>
                              <p className="mt-1 text-sm font-medium text-slate-900">
                                {qualification.qualificationName ||
                                  `Qualification ${qualification.qualificationId}`}
                              </p>
                            </div>
                            {qualification.university && (
                              <div>
                                <label className="block text-xs font-semibold text-slate-600 uppercase">
                                  University
                                </label>
                                <p className="mt-1 text-sm font-medium text-slate-900">
                                  {qualification.university}
                                </p>
                              </div>
                            )}
                            {qualification.graduationYear && (
                              <div>
                                <label className="block text-xs font-semibold text-slate-600 uppercase">
                                  Graduation Year
                                </label>
                                <p className="mt-1 text-sm font-medium text-slate-900">
                                  {qualification.graduationYear}
                                </p>
                              </div>
                            )}
                            {qualification.gpa && (
                              <div>
                                <label className="block text-xs font-semibold text-slate-600 uppercase">
                                  GPA
                                </label>
                                <p className="mt-1 text-sm font-medium text-slate-900">
                                  {qualification.gpa}
                                </p>
                              </div>
                            )}
                          </div>
                          {qualification.notes && (
                            <div className="mt-3">
                              <label className="block text-xs font-semibold text-slate-600 uppercase">
                                Notes
                              </label>
                              <p className="mt-1 text-xs text-slate-800">
                                {qualification.notes}
                              </p>
                            </div>
                          )}
                        </div>
                      )
                    )}
                  </div>
                )}

              {(candidateData.highestEducation ||
                candidateData.university ||
                candidateData.graduationYear ||
                candidateData.gpa) && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
                  {candidateData.highestEducation && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 uppercase">
                        Highest Education
                      </label>
                      <p className="mt-1 text-sm font-medium text-slate-900">
                        {candidateData.highestEducation}
                      </p>
                    </div>
                  )}
                  {candidateData.university && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 uppercase">
                        University
                      </label>
                      <p className="mt-1 text-sm font-medium text-slate-900">
                        {candidateData.university}
                      </p>
                    </div>
                  )}
                  {candidateData.graduationYear && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 uppercase">
                        Graduation Year
                      </label>
                      <p className="mt-1 text-sm font-medium text-slate-900">
                        {candidateData.graduationYear}
                      </p>
                    </div>
                  )}
                  {candidateData.gpa && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 uppercase">
                        GPA
                      </label>
                      <p className="mt-1 text-sm font-medium text-slate-900">
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
            <Card className="border border-slate-300 rounded-md shadow-sm bg-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg font-semibold text-slate-800 px-4 py-3 border-b border-slate-200">
                  <Briefcase className="h-5 w-5 text-blue-600" />
                  Work Experience ({candidateData.workExperiences.length} entries)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 p-4">
                {candidateData.workExperiences.map((experience, index) => (
                  <div
                    key={experience.id || index}
                    className="border border-slate-200 rounded-md p-4 bg-slate-50"
                  >
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                      <div className="flex-1">
                        <h4 className="text-sm font-semibold text-slate-900">
                          {experience.jobTitle}
                        </h4>
                        <p className="text-xs font-medium text-slate-600">
                          {experience.companyName}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          {formatDate(experience.startDate)} -{" "}
                          {experience.isCurrent ? "Present" : formatDate(experience.endDate)}
                        </p>
                        {experience.location && (
                          <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                            <MapPin className="h-3 w-3" />
                            {experience.location}
                          </p>
                        )}
                        {experience.description && (
                          <p className="text-xs text-slate-700 mt-2">{experience.description}</p>
                        )}
                        {experience.skills && experience.skills.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-3">
                            {experience.skills.map(
                              (skill: string, skillIndex: number) => (
                                <Badge
                                  key={skillIndex}
                                  variant="outline"
                                  className="text-xs text-blue-600 border-blue-600"
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

      <DialogFooter className="flex items-center justify-center gap-4 px-6 py-4 border-t border-slate-200 bg-slate-50">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
          className="min-w-[120px] border-slate-400 text-slate-700 hover:text-slate-900 hover:border-slate-600 transition"
        >
          <X className="h-4 w-4 mr-2" />
          Back to Edit
        </Button>
        <Button
          type="button"
          onClick={onConfirm}
          disabled={isLoading}
          className="min-w-[140px] bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white shadow-md hover:shadow-lg transition-all duration-200 rounded"
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
